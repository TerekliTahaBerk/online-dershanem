import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { assertCoachOrTeacherAccess } from "@/lib/kocum/access-server";
import { istanbulDayStart } from "@/lib/istanbul-time";

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

  if (parsed.data.decision === "REJECTED") {
    await prisma.weeklyPlanSuggestion.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedById: auth.session.userId,
      },
    });
    return NextResponse.json({ ok: true, status: "REJECTED" });
  }

  let createdTaskId: string | null = null;

  if (parsed.data.applyTasks) {
    const payload = suggestion.payload as Record<string, unknown>;
    if (suggestion.kind === "REVIEW_QUEUE" || suggestion.kind === "MOCK_EXAM_FOLLOWUP") {
      let plan = await prisma.weeklyPlan.findUnique({
        where: {
          studentId_weekStart: {
            studentId: suggestion.studentId,
            weekStart: suggestion.weekStart,
          },
        },
      });
      if (!plan) {
        plan = await prisma.weeklyPlan.create({
          data: {
            studentId: suggestion.studentId,
            weekStart: suggestion.weekStart,
            status: "DRAFT",
            capacityMinutes: 40,
            createdById: auth.session.userId,
            ruleVersion: "kocum-suggestion-v1",
          },
        });
      }

      const scheduledFor = istanbulDayStart(new Date());
      const last = await prisma.weeklyPlanTask.findFirst({
        where: { planId: plan.id, scheduledFor },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      const task = await prisma.weeklyPlanTask.create({
        data: {
          planId: plan.id,
          scheduledFor,
          position: (last?.position || 0) + 1,
          title: suggestion.title,
          description: suggestion.rationale,
          subject: typeof payload.subject === "string" ? payload.subject : null,
          taskKind: suggestion.kind === "MOCK_EXAM_FOLLOWUP" ? "ERROR_ANALYSIS" : "REVIEW",
          durationMinutes: 40,
          sourceType: "SYSTEM_SUGGESTED",
          reasonCode: suggestion.kind === "REVIEW_QUEUE" ? "REVIEW_DUE" : "NEEDS_REVIEW",
          status: "PLANNED",
          priority: "HIGH",
        },
      });
      createdTaskId = task.id;
    }
  }

  await prisma.weeklyPlanSuggestion.update({
    where: { id },
    data: {
      status: "ACCEPTED",
      reviewedAt: new Date(),
      reviewedById: auth.session.userId,
    },
  });

  return NextResponse.json({ ok: true, status: "ACCEPTED", createdTaskId });
}
