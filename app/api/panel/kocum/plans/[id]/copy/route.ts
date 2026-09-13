import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { assertCoachOrTeacherAccess } from "@/lib/kocum/access-server";
import { recordPlanRevision } from "@/lib/kocum/server";
import { buildRevisionChangeSummary, selectTasksForPlanCopy } from "@/lib/kocum";
import { addIstanbulCalendarDays, istanbulWeekStart } from "@/lib/istanbul-time";

const bodySchema = z.object({
  targetWeekStart: z.string().datetime().optional(),
  carryOverIncomplete: z.boolean().default(true),
});

/** Plan kopyala + isteğe bağlı önceki haftadan eksikleri taşı. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.kocum.plan_copy",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-copy:${auth.session.userId}`,
    rateLimit: { max: 30, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const source = await prisma.weeklyPlan.findUnique({
    where: { id },
    include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
  });
  if (!source) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });

  const allowed = await assertCoachOrTeacherAccess({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: source.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  const targetWeekStart = istanbulWeekStart(
    parsed.data.targetWeekStart
      ? new Date(parsed.data.targetWeekStart)
      : addIstanbulCalendarDays(source.weekStart, 7),
  );

  const existing = await prisma.weeklyPlan.findUnique({
    where: {
      studentId_weekStart: { studentId: source.studentId, weekStart: targetWeekStart },
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Hedef haftada plan zaten var." }, { status: 409 });
  }

  const dayDelta = targetWeekStart.getTime() - source.weekStart.getTime();
  /*
   * ESKİ FİLTRE YANLIŞ İŞİ TAŞIYORDU. `carryOverIncomplete` açıkken
   * TAMAMLANMIŞ (`DONE`) görevler kopyalanıyor, buna karşılık `COULD_NOT` ve
   * `PARTIAL` — yani öğrencinin gerçekten bitiremediği iş — dışarıda
   * kalıyordu. Devretmenin amacı tam tersidir (§9, §10).
   */
  const tasksToCopy = selectTasksForPlanCopy(source.tasks, {
    carryOverIncomplete: parsed.data.carryOverIncomplete,
  });
  if (!tasksToCopy.length) {
    return NextResponse.json(
      { error: "Taşınacak görev yok." },
      { status: 400 },
    );
  }

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.weeklyPlan.create({
      data: {
        studentId: source.studentId,
        weekStart: targetWeekStart,
        status: "DRAFT",
        capacityMinutes: tasksToCopy.reduce((sum, t) => sum + t.durationMinutes, 0) || source.capacityMinutes,
        createdById: auth.session.userId,
        ruleVersion: "kocum-copy-v1",
      },
    });

    if (tasksToCopy.length) {
      await tx.weeklyPlanTask.createMany({
        data: tasksToCopy.map((task, index) => ({
          planId: created.id,
          scheduledFor: new Date(task.scheduledFor.getTime() + dayDelta),
          position: task.position || index + 1,
          title: task.title,
          description: task.description,
          subject: task.subject,
          topic: task.topic,
          taskKind: task.taskKind,
          scheduleMode: task.scheduleMode,
          durationMinutes: task.durationMinutes,
          targetType: task.targetType,
          targetValue: task.targetValue,
          dueAt: task.dueAt ? new Date(task.dueAt.getTime() + dayDelta) : null,
          priority: task.priority,
          // Kaynak ve gerekçe OLDUĞU GİBİ korunur (§10). Eskiden REVIEW,
          // RECOVERY, MOCK_EXAM gibi kaynaklar `MANUAL_COACH`'a düzleniyordu:
          // görev taşındıktan sonra neden var olduğu kayboluyor, "Tekrar
          // kuyruğu" görevi "Koç görevi" gibi görünüyordu.
          sourceType: task.sourceType,
          sourceReferenceId: task.sourceReferenceId,
          reasonCode: task.reasonCode,
          status: "PLANNED",
        })),
      });
    }

    return created;
  }).catch((error: unknown) => {
    // Aynı anda iki kopyalama isteği (çift tıklama, iki koç) hedef haftada
    // tek plan bırakır: benzersizlik ihlali 500 değil 409 döner.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return null;
    }
    throw error;
  });

  if (!plan) {
    return NextResponse.json({ error: "Hedef haftada plan zaten var." }, { status: 409 });
  }

  await recordPlanRevision({
    planId: plan.id,
    version: plan.version,
    changedById: auth.session.userId,
    changeSummary: buildRevisionChangeSummary({
      previousVersion: 0,
      nextVersion: 1,
      actorLabel: "Plan kopyası",
    }),
  });

  return NextResponse.json({ ok: true, planId: plan.id, weekStart: targetWeekStart.toISOString() });
}
