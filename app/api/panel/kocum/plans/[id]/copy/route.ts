import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { assertCoachOrTeacherAccess } from "@/lib/kocum/access-server";
import { recordPlanRevision } from "@/lib/kocum/server";
import { buildRevisionChangeSummary, isOpenTaskStatus } from "@/lib/kocum";
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
  const tasksToCopy = source.tasks.filter((task) => {
    if (task.status === "SKIPPED") return false;
    if (parsed.data.carryOverIncomplete) return isOpenTaskStatus(task.status) || task.status === "DONE";
    return true;
  });

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
          // ASSIGNMENT referansı korunur — duplicate Assignment oluşturulmaz.
          sourceType: task.sourceType === "ASSIGNMENT" ? "ASSIGNMENT" : task.sourceType === "TEMPLATE" ? "TEMPLATE" : "MANUAL_COACH",
          sourceReferenceId: task.sourceReferenceId,
          reasonCode: task.reasonCode,
          status: "PLANNED",
        })),
      });
    }

    return created;
  });

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
