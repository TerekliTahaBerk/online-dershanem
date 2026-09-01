import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { assertCoachOrTeacherAccess } from "@/lib/kocum/access-server";
import { appendTimelineEvent, recordPlanRevision } from "@/lib/kocum/server";
import { buildRevisionChangeSummary } from "@/lib/kocum";
import { istanbulDayStart, istanbulWeekStart } from "@/lib/istanbul-time";

const createSchema = z.object({
  studentId: z.string().min(1),
  weekStart: z.string().datetime().optional(),
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(1000).optional().nullable(),
  subject: z.string().trim().max(80).optional().nullable(),
  topic: z.string().trim().max(120).optional().nullable(),
  taskKind: z
    .enum([
      "TOPIC_STUDY",
      "QUESTION_PRACTICE",
      "REVIEW",
      "VIDEO",
      "MATERIAL_READ",
      "CLASSIC_ASSIGNMENT",
      "MOCK_EXAM",
      "ERROR_ANALYSIS",
      "PERSONAL_GOAL",
      "CUSTOM",
    ])
    .default("CUSTOM"),
  scheduleMode: z.enum(["SCHEDULED", "FLEXIBLE"]).default("FLEXIBLE"),
  scheduledFor: z.string().datetime(),
  durationMinutes: z.number().int().min(5).max(480),
  targetType: z.enum(["QUESTIONS", "MINUTES", "PAGES", "VIDEOS", "NONE"]).default("NONE"),
  targetValue: z.number().min(0).max(5000).optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  sourceType: z
    .enum(["MANUAL_COACH", "ASSIGNMENT", "REVIEW", "MOCK_EXAM", "SYSTEM_SUGGESTED", "PERSONAL_GOAL"])
    .default("MANUAL_COACH"),
  sourceReferenceId: z.string().min(1).optional().nullable(),
  dueAt: z.string().datetime().optional().nullable(),
});

/** Koç/öğretmen manuel plan görevi ekler. ASSIGNMENT kaynaklıysa yalnız referans tutulur. */
export async function POST(request: Request) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.kocum.task_create",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-create:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz görev." }, { status: 400 });
  }

  const allowed = await assertCoachOrTeacherAccess({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: parsed.data.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  if (parsed.data.sourceType === "ASSIGNMENT") {
    if (!parsed.data.sourceReferenceId) {
      return NextResponse.json({ error: "Ödev referansı gerekli." }, { status: 400 });
    }
    // Duplicate task for same assignment in same week is blocked.
    const weekStart = istanbulWeekStart(new Date(parsed.data.scheduledFor));
    const dup = await prisma.weeklyPlanTask.findFirst({
      where: {
        sourceType: "ASSIGNMENT",
        sourceReferenceId: parsed.data.sourceReferenceId,
        plan: { studentId: parsed.data.studentId, weekStart },
      },
      select: { id: true },
    });
    if (dup) {
      return NextResponse.json({ error: "Bu ödev zaten plana bağlı." }, { status: 409 });
    }
  }

  const scheduledFor = istanbulDayStart(new Date(parsed.data.scheduledFor));
  const weekStart = istanbulWeekStart(parsed.data.weekStart ? new Date(parsed.data.weekStart) : scheduledFor);

  const result = await prisma.$transaction(async (tx) => {
    let plan = await tx.weeklyPlan.findUnique({
      where: { studentId_weekStart: { studentId: parsed.data.studentId, weekStart } },
    });
    if (!plan) {
      plan = await tx.weeklyPlan.create({
        data: {
          studentId: parsed.data.studentId,
          weekStart,
          status: "DRAFT",
          capacityMinutes: parsed.data.durationMinutes,
          createdById: auth.session.userId,
          ruleVersion: "kocum-manual-v1",
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
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        subject: parsed.data.subject ?? null,
        topic: parsed.data.topic ?? null,
        taskKind: parsed.data.taskKind,
        scheduleMode: parsed.data.scheduleMode,
        durationMinutes: parsed.data.durationMinutes,
        targetType: parsed.data.targetType,
        targetValue: parsed.data.targetValue ?? null,
        priority: parsed.data.priority,
        sourceType: parsed.data.sourceType,
        sourceReferenceId: parsed.data.sourceReferenceId ?? null,
        reasonCode: "CAPACITY_BALANCE",
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        status: "PLANNED",
      },
    });

    const nextVersion = plan.version + 1;
    await tx.weeklyPlan.update({
      where: { id: plan.id },
      data: {
        version: nextVersion,
        capacityMinutes: plan.capacityMinutes + parsed.data.durationMinutes,
      },
    });

    return { task, planId: plan.id, version: nextVersion, previousVersion: plan.version, status: plan.status, studentId: plan.studentId };
  });

  await recordPlanRevision({
    planId: result.planId,
    version: result.version,
    changedById: auth.session.userId,
    changeSummary: buildRevisionChangeSummary({
      previousVersion: result.previousVersion,
      nextVersion: result.version,
      actorLabel: auth.session.fullName || "Koç",
    }),
  });

  if (result.status === "APPROVED") {
    await appendTimelineEvent({
      studentId: result.studentId,
      kind: "PLAN_REVISED",
      title: "Plana yeni görev eklendi",
      summary: result.task.title,
      visibility: "STUDENT",
    });
  }

  return NextResponse.json({ ok: true, taskId: result.task.id, planId: result.planId, version: result.version });
}
