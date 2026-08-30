import "server-only";
import { prisma } from "@/lib/prisma";
import { buildRecoveryDraft } from "@/lib/recovery-package";
import { buildAdaptiveWeek } from "@/lib/adaptive-plan";
import { collectPlanCandidates } from "@/lib/adaptive-plan-server";

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
