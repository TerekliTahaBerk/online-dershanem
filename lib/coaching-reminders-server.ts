import "server-only";
import { coachApprovalDeadline } from "./coach-approval-window";
import { prisma } from "./prisma";
import { lessonReminderRange } from "./lesson-reminder-window";
import { queueReminderNotification } from "./reminder-notifications";
import { istanbulWeekStart, formatIstanbulDateInput } from "./istanbul-time";
import { getPanelFeatureFlags } from "./panel-feature-flags";
import type { Prisma } from "@prisma/client";
const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" });
function activeAssignment(now: Date): Prisma.CoachAssignmentWhereInput {
  return {
    endedAt: null,
    coach: { user: { status: "ACTIVE" } },
    student: { user: { status: "ACTIVE", productMemberships: { some: {
      product: "OK", revokedAt: null, startsAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    } } } },
  };
}
export async function runCoachingReminders(now: Date) {
  const sessions = await prisma.coachingSession.findMany({ where: { status: "PLANNED", rescheduleRequestedAt: null, scheduledAt: lessonReminderRange(now, 24), assignment: activeAssignment(now) }, select: { id: true } });
  let notifications = 0;
  for (const candidate of sessions) notifications += await prisma.$transaction(async (tx) => {
    const session = await tx.coachingSession.findFirst({ where: { id: candidate.id, status: "PLANNED", rescheduleRequestedAt: null, scheduledAt: lessonReminderRange(now, 24), assignment: activeAssignment(now) }, select: { id: true, scheduledAt: true, assignment: { select: { studentId: true, student: { select: { userId: true, parents: { where: { active: true, endedAt: null, canViewAcademic: true }, select: { parentId: true } } } } } } } });
    if (!session) return 0;
    const recipients = new Map([[session.assignment.student.userId, "/panel/ogrenci/kocluk"]]);
    for (const link of session.assignment.student.parents) recipients.set(link.parentId, `/panel/veli/kocluk?studentId=${session.assignment.studentId}`);
    let count = 0;
    for (const [userId, href] of recipients) count += await queueReminderNotification(tx, { id: `${userId}:COACHING:${session.id}:T24:${session.scheduledAt.toISOString()}`, userId, type: "SYSTEM", title: "Yarınki koçluk görüşmeniz", body: `${DATE.format(session.scheduledAt)}. Katılım bilgisini koçluk ekranından kontrol edebilirsiniz.`, href }, "lessonSummary");
    return count;
  });
  return { processed: sessions.length, notifications };
}
export async function runCoachPlanApprovalReminders(now = new Date()) {
  if (now < coachApprovalDeadline(now) || !getPanelFeatureFlags().adaptivePlan) return { processed: 0, notifications: 0 };
  const weekStart = istanbulWeekStart(now);
  const scope: Prisma.CoachAssignmentWhereInput = { AND: [activeAssignment(now), { student: { weeklyPlans: { none: { weekStart, status: "APPROVED" } } } }] };
  const assignments = await prisma.coachAssignment.findMany({ where: scope, select: { id: true } });
  let notifications = 0;
  for (const candidate of assignments) notifications += await prisma.$transaction(async (tx) => {
    const assignment = await tx.coachAssignment.findFirst({ where: { ...scope, id: candidate.id }, select: { id: true, studentId: true, coach: { select: { userId: true } } } });
    if (!assignment) return 0;
    return queueReminderNotification(tx, { id: `${assignment.coach.userId}:PLAN:${assignment.id}:APPROVAL:${formatIstanbulDateInput(weekStart)}`, userId: assignment.coach.userId, type: "SYSTEM", title: "Haftalık plan onay bekliyor", body: "Bu haftanın planını kontrol edip öğrenciyle paylaşabilirsiniz.", href: `/panel/ogretmen/hazirlik/${assignment.studentId}` }, "weeklyDigest");
  });
  return { processed: assignments.length, notifications };
}
