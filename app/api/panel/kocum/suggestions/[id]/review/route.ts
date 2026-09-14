import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { assertCoachOrTeacherAccess } from "@/lib/kocum/access-server";
import { recordPlanRevision } from "@/lib/kocum/server";
import { buildRevisionChangeSummary, isDateWithinPlanWeek } from "@/lib/kocum";
import { istanbulDayStart, istanbulWeekStart } from "@/lib/istanbul-time";
import { getOkPlanProductId } from "@/lib/kocum/plan-product";

/** Öneriden doğan görevin varsayılan süresi. */
const SUGGESTION_TASK_MINUTES = 40;

const bodySchema = z.object({
  decision: z.enum(["ACCEPTED", "REJECTED"]),
  /** ACCEPTED ise öneri payload'ından görev oluştur. */
  applyTasks: z.boolean().default(true),
});

/**
 * Sistem önerir → koç inceler → düzenler/onaylar → öğrenci görür.
 * Otomatik publish yok.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.kocum.suggestion_review",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-suggestion:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz karar." }, { status: 400 });
  }

  const suggestion = await prisma.weeklyPlanSuggestion.findUnique({ where: { id } });
  if (!suggestion || suggestion.status !== "PENDING") {
    return NextResponse.json({ error: "Öneri bulunamadı." }, { status: 404 });
  }

  const allowed = await assertCoachOrTeacherAccess({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: suggestion.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  /*
   * ÖNCE KARARI KAP, SONRA GÖREVİ ÜRET.
   *
   * Eskiden görev önce yaratılıyor, öneri statüsü sonra yazılıyordu. İki
   * paralel onay (çift tıklama, iki koç aynı gelen kutusunda) `PENDING`
   * kontrolünü ikisi de geçiyor ve AYNI öneriden İKİ görev doğuyordu (§11).
   * Koşullu `updateMany` yalnız tek kazanan bırakır.
   */
  const claim = await prisma.weeklyPlanSuggestion.updateMany({
    where: { id, status: "PENDING" },
    data: {
      status: parsed.data.decision,
      reviewedAt: new Date(),
      reviewedById: auth.session.userId,
    },
  });
  if (claim.count !== 1) {
    return NextResponse.json({ error: "Bu öneri zaten karara bağlanmış." }, { status: 409 });
  }

  if (parsed.data.decision === "REJECTED") {
    await recordPanelProductEvent(
      {
        name: "kocum_suggestion_reviewed",
        properties: { decision: "REJECTED", kind: suggestion.kind, taskCreated: false },
      },
      auth.session.role,
    );
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  let createdTaskId: string | null = null;

  if (parsed.data.applyTasks) {
    const payload = suggestion.payload as Record<string, unknown>;
    if (suggestion.kind === "REVIEW_QUEUE" || suggestion.kind === "MOCK_EXAM_FOLLOWUP") {
      const weekStart = istanbulWeekStart(suggestion.weekStart);
      /*
       * Görev, ÖNERİNİN HAFTASINA düşmeli. Eskiden `scheduledFor` koşulsuz
       * "bugün" idi: adaptif tarama önerileri GELECEK haftaya yazdığı için
       * görev, ait olduğu planın haftası dışında doğuyordu. Böyle bir görev
       * hafta görünümünde hiç listelenmiyor, buna karşılık takvimde önceki
       * haftada beliriyordu — ve `reschedule` ucu aynı tarihi reddediyordu.
       */
      const today = istanbulDayStart(new Date());
      const scheduledFor = isDateWithinPlanWeek(today, weekStart)
        ? today
        : weekStart;

      const okProductId = await getOkPlanProductId();
      const result = await prisma.$transaction(async (tx) => {
        let plan = await tx.weeklyPlan.findUnique({
          where: { studentId_weekStart: { studentId: suggestion.studentId, weekStart } },
        });
        if (!plan) {
          plan = await tx.weeklyPlan.create({
            data: {
              studentId: suggestion.studentId,
              // Koçluk önerisinin onaylanması bir Online Koçum planı üretir.
              productRefId: okProductId,
              weekStart,
              status: "DRAFT",
              capacityMinutes: SUGGESTION_TASK_MINUTES,
              createdById: auth.session.userId,
              ruleVersion: "kocum-suggestion-v1",
            },
          });
        }

        const last = await tx.weeklyPlanTask.findFirst({
          where: { planId: plan.id, scheduledFor },
          orderBy: { position: "desc" },
          select: { position: true },
        });

        const task = await tx.weeklyPlanTask.create({
          data: {
            planId: plan.id,
            scheduledFor,
            position: (last?.position || 0) + 1,
            title: suggestion.title,
            description: suggestion.rationale,
            subject: typeof payload.subject === "string" ? payload.subject : null,
            taskKind: suggestion.kind === "MOCK_EXAM_FOLLOWUP" ? "ERROR_ANALYSIS" : "REVIEW",
            durationMinutes: SUGGESTION_TASK_MINUTES,
            sourceType: "SYSTEM_SUGGESTED",
            sourceReferenceId: suggestion.id,
            reasonCode: suggestion.kind === "REVIEW_QUEUE" ? "REVIEW_DUE" : "NEEDS_REVIEW",
            status: "PLANNED",
            priority: "HIGH",
          },
        });

        // Yayınlanmış plana yapılan HER değişiklik sürüm artırır ve revizyon
        // üretir (§28). Öneri kabulü buradan kaçıyordu: görev sessizce
        // ekleniyor, plan sürümü sabit kalıyordu — açık iki sekmeden biri
        // eski sürümle çakışma tespit edemiyordu.
        const nextVersion = plan.version + 1;
        await tx.weeklyPlan.update({
          where: { id: plan.id },
          data: {
            version: nextVersion,
            capacityMinutes: plan.capacityMinutes + SUGGESTION_TASK_MINUTES,
          },
        });

        await recordPlanRevision({
          planId: plan.id,
          version: nextVersion,
          changedById: auth.session.userId,
          changeSummary: buildRevisionChangeSummary({
            previousVersion: plan.version,
            nextVersion,
            actorLabel: `Öneri kabul: ${suggestion.title}`,
          }),
          tx,
        });

        return { taskId: task.id };
      });

      createdTaskId = result.taskId;
    }
  }

  await recordPanelProductEvent(
    {
      name: "kocum_suggestion_reviewed",
      properties: {
        decision: "ACCEPTED",
        kind: suggestion.kind,
        taskCreated: createdTaskId !== null,
      },
    },
    auth.session.role,
  );

  return NextResponse.json({ ok: true, status: "ACCEPTED", createdTaskId });
}
