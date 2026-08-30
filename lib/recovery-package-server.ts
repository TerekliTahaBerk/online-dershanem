import "server-only";
import { prisma } from "@/lib/prisma";
import { buildRecoveryDraft } from "@/lib/recovery-package";
import { buildAdaptiveWeek } from "@/lib/adaptive-plan";
import { collectPlanCandidates } from "@/lib/adaptive-plan-server";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";

export async function generateRecoveryPackage(attendanceId: string, teacherId: string) {
  const attendance = await prisma.attendance.findFirst({
    where: { id: attendanceId, status: { in: ["ABSENT", "EXCUSED"] }, lesson: { status: "COMPLETED", teacherId, group: { isActive: true } } },
    include: {
      student: { select: { id: true } },
      lesson: {
        include: {
          notes: { where: { studentId: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { topic: true, nextGoal: true, homework: true } },
          materials: { where: { isActive: true }, orderBy: { createdAt: "asc" }, take: 3, select: { id: true, title: true } },
          assignments: { where: { isActive: true }, orderBy: { dueAt: "asc" }, take: 2, select: { id: true, title: true } },
        },
      },
    },
  });
  if (!attendance) return null;
  const activeEnrollment = await prisma.enrollment.findFirst({ where: { groupId: attendance.lesson.groupId, studentId: attendance.studentId, endedAt: null }, select: { id: true } });
  if (!activeEnrollment) return null;
  const current = await prisma.recoveryPackage.findUnique({ where: { lessonId_studentId: { lessonId: attendance.lessonId, studentId: attendance.studentId } }, include: { items: true } });
  if (current && current.status !== "DRAFT") return { package: current, reused: true };
  const shared = attendance.lesson.notes[0];
  const draft = buildRecoveryDraft({ lessonTitle: attendance.lesson.title, lessonEndsAt: attendance.lesson.endsAt, sharedTopic: shared?.topic, sharedNextGoal: shared?.nextGoal, sharedHomework: shared?.homework, materials: attendance.lesson.materials, assignments: attendance.lesson.assignments });
  const row = await prisma.$transaction(async (tx) => {
    const packageRow = current
      ? await tx.recoveryPackage.update({ where: { id: current.id }, data: { ruleVersion: draft.ruleVersion, summaryTopic: draft.summaryTopic, summaryNextStep: draft.summaryNextStep, checkpointPrompt: draft.checkpointPrompt, dueAt: draft.dueAt, generatedById: teacherId, version: { increment: 1 } } })
      : await tx.recoveryPackage.create({ data: { lessonId: attendance.lessonId, studentId: attendance.studentId, ruleVersion: draft.ruleVersion, summaryTopic: draft.summaryTopic, summaryNextStep: draft.summaryNextStep, checkpointPrompt: draft.checkpointPrompt, dueAt: draft.dueAt, generatedById: teacherId } });
    if (current) await tx.recoveryPackageItem.deleteMany({ where: { packageId: packageRow.id } });
    if (draft.items.length) await tx.recoveryPackageItem.createMany({ data: draft.items.map((item) => ({ packageId: packageRow.id, kind: item.kind, position: item.position, title: item.title, materialId: item.materialId, assignmentId: item.assignmentId })) });
    return tx.recoveryPackage.findUniqueOrThrow({ where: { id: packageRow.id }, include: { items: { orderBy: { position: "asc" } } } });
  });
  return { package: row, reused: false };
}

export type PublishRecoveryPackageResult =
  | { kind: "NOT_FOUND" }
  | { kind: "CONFLICT" }
  | { kind: "REPLAYED"; itemCount: number; publishDelayMs: number }
  | { kind: "PUBLISHED"; itemCount: number; publishDelayMs: number; planRebalanced: boolean };

const MAX_AGE = 365 * 24 * 60 * 60 * 1000;

export async function publishRecoveryPackage(input: {
  packageId: string;
  teacherId: string;
  expectedVersion?: number;
  rebalancePlan?: boolean;
}): Promise<PublishRecoveryPackageResult> {
  const item = await prisma.recoveryPackage.findFirst({
    where: { id: input.packageId, lesson: { teacherId: input.teacherId, status: "COMPLETED", group: { isActive: true } } },
    include: { lesson: { select: { groupId: true, endsAt: true } }, student: { include: { user: { select: { id: true } } } }, items: true },
  });
  if (!item) return { kind: "NOT_FOUND" };
  const enrollment = await prisma.enrollment.findFirst({
    where: { groupId: item.lesson.groupId, studentId: item.studentId, endedAt: null },
    select: { id: true },
  });
  if (!enrollment) return { kind: "NOT_FOUND" };
  const publishDelayMs = Math.min(MAX_AGE, Math.max(0, Date.now() - item.lesson.endsAt.getTime()));
  if (item.status !== "DRAFT") {
    if (input.expectedVersion !== undefined && (!item.publishedAt || item.version !== input.expectedVersion + 1)) return { kind: "CONFLICT" };
    return { kind: "REPLAYED", itemCount: item.items.length, publishDelayMs };
  }
  const rawRows = [{ userId: item.student.user.id, type: "ABSENCE" as const, title: "Kaçırdığın ders için küçük telafi hazır", body: "Özet, kaynak ve mini kontrol tek sırada hazır.", href: "/panel/ogrenci/telafi" }];
  const rows = await filterNotificationRows(rawRows, "absence");
  const changed = await prisma.$transaction(async (tx) => {
    const where = input.expectedVersion === undefined
      ? { id: item.id, status: "DRAFT" as const }
      : { id: item.id, status: "DRAFT" as const, version: input.expectedVersion };
    const updated = await tx.recoveryPackage.updateMany({
      where,
      data: { status: "PUBLISHED", publishedById: input.teacherId, publishedAt: new Date(), version: { increment: 1 } },
    });
    if (updated.count !== 1) return false;
    if (rows.length) await tx.notification.createMany({ data: rows });
    return true;
  });
  if (!changed) {
    const latest = await prisma.recoveryPackage.findUnique({ where: { id: item.id }, select: { status: true, version: true, publishedAt: true } });
    if (!latest) return { kind: "CONFLICT" };
    if (latest.status !== "DRAFT") {
      if (input.expectedVersion !== undefined && (!latest.publishedAt || latest.version !== input.expectedVersion + 1)) return { kind: "CONFLICT" };
      return { kind: "REPLAYED", itemCount: item.items.length, publishDelayMs };
    }
    return { kind: "CONFLICT" };
  }
  await queuePanelNotificationEmails(rawRows, "absence");
  const planRebalanced = input.rebalancePlan ? await rebalanceApprovedPlanForRecovery(item.studentId, input.teacherId).catch(() => false) : false;
  return { kind: "PUBLISHED", itemCount: item.items.length, publishDelayMs, planRebalanced };
}

/** Yayın onayı, kilitli planı telafi önceliğiyle fakat aynı günlük kapasite sınırlarıyla yeniden kurar. */
export async function rebalanceApprovedPlanForRecovery(studentId: string, approvedById: string): Promise<boolean> {
  const preference = await prisma.studentPlanPreference.findUnique({ where: { studentId } });
  if (!preference?.planningEnabled) return false;
  const plan = await prisma.weeklyPlan.findFirst({ where: { studentId, status: "APPROVED" }, orderBy: { weekStart: "desc" }, include: { tasks: true } });
  if (!plan) return false;
  const completedSources = new Set(plan.tasks.filter((task) => task.status === "DONE").map((task) => `${task.sourceType}:${task.sourceReferenceId || task.title}`));
  const candidates = (await collectPlanCandidates(studentId, preference)).filter((item) => !completedSources.has(`${item.sourceType}:${item.sourceReferenceId || item.title}`));
  const availableDays = Array.isArray(preference.availableDays) ? preference.availableDays.filter((day): day is number => typeof day === "number") : [];
  const tasks = buildAdaptiveWeek({ now: new Date(), availableDays, minutesPerDay: preference.minutesPerDay, maxTasksPerDay: Math.min(3, preference.maxTasksPerDay), candidates });
  await prisma.$transaction(async (tx) => {
    await tx.weeklyPlan.update({ where: { id: plan.id }, data: { ruleVersion: "adaptive-v1", approvedById, approvedAt: new Date(), generatedAt: new Date(), version: { increment: 1 } } });
    await tx.weeklyPlanTask.updateMany({ where: { planId: plan.id, status: "PLANNED" }, data: { status: "SKIPPED" } });
    if (tasks.length) await tx.weeklyPlanTask.createMany({ data: tasks.map((task) => ({ planId: plan.id, ...task })) });
  });
  return true;
}
