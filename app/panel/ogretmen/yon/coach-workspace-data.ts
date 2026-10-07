import "server-only";

import { prisma } from "@/lib/prisma";
import type { PanelFeatureFlags } from "@/lib/panel-feature-flags";
import { coachingOverdue } from "@/lib/coaching";
import { buildWeeklyKocumMetrics } from "@/lib/kocum/metrics";
import { buildCoachWorkspace, latestExamByStudent, type CoachStudentSignals } from "@/lib/kocum/coach-workspace";
import { sectionNet } from "@/lib/mock-exams";
import { addIstanbulCalendarDays, formatIstanbulDateInput, istanbulWeekStart } from "@/lib/istanbul-time";
import { studentCheckInWeekEnd, studentCheckInWeekStart } from "@/lib/student-check-in";

/**
 * Koç çalışma alanı okuma modeli (Bugün, Öğrencilerim, Görüşmeler ortak).
 * Kapsam: giriş yapan koçun AKTİF atamaları (`coach.userId`, `endedAt = null`).
 * Gizli/paylaşılan görüşme notu okunmaz; yalnız sayılar ve durumlar.
 */
export async function loadCoachWorkspace(userId: string, flags: Pick<PanelFeatureFlags, "adaptivePlan" | "studentCheckIn">) {
  const session = { userId };
  const now = new Date();
  const todayKey = formatIstanbulDateInput(now);
  const weekStart = istanbulWeekStart(now);
  const weekEnd = addIstanbulCalendarDays(weekStart, 7);

  const assignments = await prisma.coachAssignment.findMany({
    where: { endedAt: null, coach: { userId: session.userId } },
    select: {
      id: true,
      cadenceDays: true,
      student: { select: { id: true, targetGoal: true, user: { select: { fullName: true, email: true } } } },
      sessions: {
        where: { OR: [{ status: "PLANNED" }, { status: "COMPLETED" }] },
        orderBy: { scheduledAt: "desc" },
        take: 20,
        // privateNote / sharedNote BİLEREK seçilmiyor.
        select: { id: true, status: true, scheduledAt: true, completedAt: true, meetingUrl: true, focus: true, rescheduleRequestedAt: true },
      },
    },
  });
  const studentIds = assignments.map((item) => item.student.id);
  const assignmentIds = assignments.map((item) => item.id);

  const [plans, checkIns, helpRequests, suggestions] = await Promise.all([
    flags.adaptivePlan && studentIds.length
      ? prisma.weeklyPlan.findMany({
          where: {
            studentId: { in: studentIds },
            weekStart: { gte: weekStart, lt: weekEnd },
            status: { in: ["DRAFT", "CHANGE_REQUESTED", "APPROVED"] },
          },
          select: {
            studentId: true,
            status: true,
            tasks: { select: { id: true, status: true, scheduledFor: true, durationMinutes: true, actualMinutes: true } },
          },
        })
      : Promise.resolve([]),
    flags.studentCheckIn && studentIds.length
      ? prisma.studentCheckIn.findMany({
          where: { studentId: { in: studentIds }, createdAt: { gte: studentCheckInWeekStart(now), lt: studentCheckInWeekEnd(now) } },
          distinct: ["studentId"],
          select: { studentId: true },
        })
      : Promise.resolve([]),
    flags.studentCheckIn && assignmentIds.length
      ? prisma.studentHelpRequest.groupBy({
          by: ["studentId"],
          where: { status: "OPEN", coachAssignmentId: { in: assignmentIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    flags.adaptivePlan && studentIds.length
      ? prisma.weeklyPlanSuggestion.groupBy({
          by: ["studentId"],
          where: { status: "PENDING", studentId: { in: studentIds } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
  ]);

  const checkInSet = new Set(checkIns.map((item) => item.studentId));
  const helpCount = new Map(helpRequests.map((item) => [item.studentId, item._count._all]));
  const suggestionCount = new Map(suggestions.map((item) => [item.studentId, item._count._all]));
  const planByStudent = new Map(plans.map((plan) => [plan.studentId, plan]));

  const todaySessions: Array<{ id: string; at: Date; studentId: string; name: string; focus: string | null; meetingUrl: string | null }> = [];
  const signals: CoachStudentSignals[] = assignments.map((assignment) => {
    const name = assignment.student.user.fullName || assignment.student.user.email;
    const planned = assignment.sessions
      .filter((item) => item.status === "PLANNED")
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const lastCompleted = assignment.sessions.find((item) => item.status === "COMPLETED")?.completedAt ?? null;
    const next = planned[0] ?? null;
    for (const item of planned) {
      if (formatIstanbulDateInput(item.scheduledAt) === todayKey) {
        todaySessions.push({ id: item.id, at: item.scheduledAt, studentId: assignment.student.id, name, focus: item.focus, meetingUrl: item.meetingUrl });
      }
    }
    const plan = planByStudent.get(assignment.student.id);
    const metrics = plan?.status === "APPROVED" && plan.tasks.length
      ? buildWeeklyKocumMetrics(plan.tasks, todayKey, formatIstanbulDateInput)
      : null;
    return {
      studentId: assignment.student.id,
      name,
      targetGoal: assignment.student.targetGoal,
      overdue: coachingOverdue(lastCompleted, next?.scheduledAt ?? null, assignment.cadenceDays).overdue,
      nextScheduledAt: next?.scheduledAt ?? null,
      rescheduleRequested: planned.some((item) => item.rescheduleRequestedAt),
      planStatus: (plan?.status as CoachStudentSignals["planStatus"]) ?? null,
      planCompletionPct: metrics ? metrics.planCompletionPct : null,
      checkInThisWeek: checkInSet.has(assignment.student.id),
      openHelpRequests: helpCount.get(assignment.student.id) ?? 0,
      pendingSuggestions: suggestionCount.get(assignment.student.id) ?? 0,
    };
  });
  todaySessions.sort((a, b) => a.at.getTime() - b.at.getTime());

  const workspace = buildCoachWorkspace(signals, { adaptivePlan: flags.adaptivePlan, studentCheckIn: flags.studentCheckIn });

  const exams = studentIds.length
    ? await prisma.mockExam.findMany({
        where: { studentId: { in: studentIds } },
        orderBy: { takenAt: "desc" },
        take: Math.min(600, studentIds.length * 6),
        select: { studentId: true, exam: true, takenAt: true, sections: { select: { correctCount: true, incorrectCount: true } } },
      })
    : [];
  const lastExam = latestExamByStudent(
    exams.map((exam) => ({
      studentId: exam.studentId,
      takenAt: exam.takenAt,
      totalNet: exam.sections.reduce((sum, section) => sum + sectionNet(exam.exam, section.correctCount, section.incorrectCount), 0),
    })),
  );

  return { now, assignmentCount: assignments.length, signals, todaySessions, workspace, lastExam };
}
