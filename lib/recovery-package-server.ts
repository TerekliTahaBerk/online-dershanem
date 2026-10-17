import "server-only";
import { prisma as defaultDb } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { afterEducationCommit, transactionalNotificationEmails } from "@/lib/panel/education-write";
import { buildRecoveryDraft } from "@/lib/recovery-package";
import { buildAdaptiveWeek, plannedTaskRows } from "@/lib/adaptive-plan";
import { collectPlanCandidates } from "@/lib/adaptive-plan-server";
import { findCoachAssignmentForCoach } from "@/lib/panel/coaching";
import { activePlanSourceKeys, planSourceKey } from "@/lib/kocum";
import { filterNotificationRows } from "@/lib/panel-notifications";

export async function generateRecoveryPackage(attendanceId: string, teacherId: string, prisma: PrismaClient = defaultDb) {
  const attendance = await prisma.attendance.findFirst({
    where: { id: attendanceId, status: { in: ["ABSENT", "EXCUSED"] }, lesson: { status: "COMPLETED", teacherId, group: { isActive: true } } },
    include: {
      student: { select: { id: true } },
      lesson: {
        include: {
          notes: { where: { studentId: null }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 1, select: { topic: true, nextGoal: true, homework: true } },
          materials: { where: { isActive: true }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], take: 3, select: { id: true, title: true } },
          assignments: { where: { isActive: true }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take: 2, select: { id: true, title: true } },
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
      ? await tx.recoveryPackage.update({ where: { id: current.id, status: "DRAFT", version: current.version }, data: { ruleVersion: draft.ruleVersion, summaryTopic: draft.summaryTopic, summaryNextStep: draft.summaryNextStep, checkpointPrompt: draft.checkpointPrompt, dueAt: draft.dueAt, generatedById: teacherId, version: { increment: 1 } } })
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
}, prisma: PrismaClient = defaultDb): Promise<PublishRecoveryPackageResult> {
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
  const rawRows = [{ userId: item.student.user.id, type: "ABSENCE" as const, title: "Kaçırdığın ders için telafi paketin hazır 🧩", body: "Özet, kaynak ve mini kontrol tek bir sırada seni bekliyor. Hiç dert etme, birlikte yetişeceğiz! 💪", href: "/panel/ogrenci/telafi" }];
  const rows = await filterNotificationRows(rawRows, "absence", prisma);
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
  await transactionalNotificationEmails(prisma)(rawRows, "absence");
  let planRebalanced = false;
  // Optional planning runs after commit: a planner failure must not abort publication.
  if (input.rebalancePlan) await afterEducationCommit(prisma, async () => {
    planRebalanced = await rebalanceApprovedPlanForRecovery(item.studentId, input.teacherId).catch(() => false);
  });
  return { kind: "PUBLISHED", itemCount: item.items.length, publishDelayMs, planRebalanced };
}

/**
 * Yayın onayı, kilitli planı telafi önceliğiyle fakat aynı günlük kapasite sınırlarıyla yeniden kurar.
 *
 * YÖN YETKİSİ: insan onayı gerektiren (Yön/OK) bir planı yeniden kurmak ve
 * onaylayan olarak işaretlenmek bir Yön yazmasıdır. Telafi paketini yayınlayan
 * OD öğretmeni öğrencinin AKTİF koçu değilse plana dokunulmaz (`false`): koç
 * onayladığı görevler sessizce SKIPPED olmaz. Telafi adayları planlayıcının
 * aday listesinde kalır; koç bir sonraki planda görür.
 */
export async function rebalanceApprovedPlanForRecovery(studentId: string, approvedById: string, prisma: PrismaClient = defaultDb): Promise<boolean> {
  const preference = await prisma.studentPlanPreference.findUnique({ where: { studentId } });
  if (!preference?.planningEnabled) return false;
  const plan = await prisma.weeklyPlan.findFirst({ where: { studentId, status: "APPROVED" }, orderBy: { weekStart: "desc" }, include: { tasks: true, productRef: { select: { requiresPlanApproval: true } } } });
  if (!plan) return false;
  if (plan.productRef.requiresPlanApproval && !(await findCoachAssignmentForCoach(approvedById, studentId))) return false;
  // Telafi dengelemesi yalnız `PLANNED` görevleri emekliye ayırır; başlanmış
  // veya kısmen bitmiş görevler ayakta kalır. Onların kaynağı da aday
  // listesinden düşülmeli, yoksa aynı iş için ikinci bir görev doğuyordu.
  const activeSources = activePlanSourceKeys(plan.tasks);
  const candidates = (await collectPlanCandidates(studentId, preference)).filter(
    (item) => !activeSources.has(planSourceKey({ ...item, title: item.title })),
  );
  const availableDays = Array.isArray(preference.availableDays) ? preference.availableDays.filter((day): day is number => typeof day === "number") : [];
  const tasks = buildAdaptiveWeek({ now: new Date(), availableDays, minutesPerDay: preference.minutesPerDay, maxTasksPerDay: Math.min(3, preference.maxTasksPerDay), candidates });
  await prisma.$transaction(async (tx) => {
    await tx.weeklyPlan.update({ where: { id: plan.id }, data: { ruleVersion: "adaptive-v1", approvedById, approvedAt: new Date(), generatedAt: new Date(), version: { increment: 1 } } });
    await tx.weeklyPlanTask.updateMany({ where: { planId: plan.id, status: "PLANNED" }, data: { status: "SKIPPED" } });
    if (tasks.length) await tx.weeklyPlanTask.createMany({ data: plannedTaskRows(plan.id, tasks) });
  });
  return true;
}
