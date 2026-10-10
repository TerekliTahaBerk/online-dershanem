import "server-only";

import { prisma } from "@/lib/prisma";
import { addIstanbulCalendarDays, istanbulWeekStart } from "@/lib/istanbul-time";
import { planningWeekStart } from "@/lib/adaptive-plan";
import { hasStaffPermission } from "@/lib/products/staff-permissions";

/**
 * YÖN KOÇU mobil okuma yükleyicileri (M7). Web koç masasıyla aynı kapsam:
 *
 *  - Öğrenci / görüşme / plan YALNIZ giriş yapan koçun AKTİF `CoachAssignment`
 *    kaydı üzerinden (`endedAt = null`, `coach.userId = koç`). OD grup
 *    öğretmenliği koçluk verisi açmaz.
 *  - Görüşme özel notu (`privateNote`) YALNIZ `ok:note:read_private` izni
 *    varken ve görüşme koçun kendi atamasındaysa döner; liste / Bugün
 *    yanıtlarına hiç girmez.
 *  - INTERNAL koç notları YALNIZ `ok:note:read_private` + aktif atama varken
 *    döner (web hazırlık sayfası shadow modunda aynı kümeyi gösterir).
 */
const assignmentScope = (coachUserId: string) => ({ endedAt: null, coach: { userId: coachUserId } });
const display = (user: { fullName: string | null; email: string }) => user.fullName || user.email;

export async function loadCoachStudentDetail(coachUserId: string, studentId: string, now = new Date()) {
  const assignment = await prisma.coachAssignment.findFirst({
    where: { ...assignmentScope(coachUserId), studentId },
    select: {
      id: true,
      student: { select: { id: true, classLevel: true, targetGoal: true, user: { select: { fullName: true, email: true } } } },
      sessions: {
        orderBy: { scheduledAt: "desc" },
        take: 12,
        // privateNote BİLEREK seçilmiyor.
        select: { id: true, status: true, scheduledAt: true, focus: true, sharedNote: true },
      },
    },
  });
  if (!assignment) return null;
  const canReadInternal = await hasStaffPermission(coachUserId, "ok:note:read_private");
  const weekStart = istanbulWeekStart(now);
  const [plan, notes] = await Promise.all([
    prisma.weeklyPlan.findFirst({
      where: { studentId, weekStart: { gte: weekStart, lt: addIstanbulCalendarDays(weekStart, 7) }, productRef: { code: "OK" } },
      select: { id: true, status: true, weekStart: true, tasks: { where: { status: { not: "SKIPPED" } }, select: { status: true } } },
    }),
    prisma.coachNote.findMany({
      where: { studentId, ...(canReadInternal ? {} : { visibility: { in: ["STUDENT_VISIBLE", "PARENT_VISIBLE"] } }) },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { id: true, body: true, visibility: true, createdAt: true, authorId: true, author: { select: { fullName: true, email: true } } },
    }),
  ]);
  const next = assignment.sessions.filter((item) => item.status === "PLANNED" && item.scheduledAt >= now).sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0] ?? null;
  return {
    studentId: assignment.student.id,
    name: display(assignment.student.user),
    classLevel: assignment.student.classLevel,
    targetGoal: assignment.student.targetGoal,
    nextSession: next ? { id: next.id, scheduledAt: next.scheduledAt } : null,
    plan: plan ? { id: plan.id, status: plan.status, weekStart: plan.weekStart, taskCount: plan.tasks.length, doneCount: plan.tasks.filter((task) => task.status === "DONE").length } : null,
    recentSessions: assignment.sessions.filter((item) => item.status !== "PLANNED").slice(0, 6),
    canReadInternal,
    notes: notes.map((note) => ({ id: note.id, body: note.body, visibility: note.visibility, createdAt: note.createdAt, authorName: note.author.fullName?.trim() || "Koç", own: note.authorId === coachUserId })),
  };
}

const sessionSelect = {
  id: true,
  scheduledAt: true,
  status: true,
  focus: true,
  rescheduleRequestedAt: true,
  proposedAt: true,
  // privateNote / sharedNote / meetingUrl BİLEREK seçilmiyor (liste).
  assignment: { select: { student: { select: { id: true, user: { select: { fullName: true, email: true } } } } } },
} as const;

/** Web `app/panel/ogretmen/yon/gorusmeler` ile aynı kapsam ve sınırlar. */
export async function loadCoachSessions(coachUserId: string, now = new Date()) {
  const scope = assignmentScope(coachUserId);
  const [upcoming, past] = await Promise.all([
    prisma.coachingSession.findMany({ where: { status: "PLANNED", assignment: scope }, orderBy: { scheduledAt: "asc" }, take: 50, select: sessionSelect }),
    prisma.coachingSession.findMany({ where: { status: { not: "PLANNED" }, scheduledAt: { gte: addIstanbulCalendarDays(now, -30) }, assignment: scope }, orderBy: { scheduledAt: "desc" }, take: 50, select: sessionSelect }),
  ]);
  return { upcoming, past };
}

export async function loadCoachSessionDetail(coachUserId: string, sessionId: string) {
  const session = await prisma.coachingSession.findFirst({
    where: { id: sessionId, assignment: assignmentScope(coachUserId) },
    select: {
      id: true,
      version: true,
      status: true,
      scheduledAt: true,
      completedAt: true,
      meetingUrl: true,
      focus: true,
      sharedNote: true,
      privateNote: true,
      rescheduleRequestedAt: true,
      rescheduleReason: true,
      proposedAt: true,
      assignment: { select: { student: { select: { id: true, user: { select: { fullName: true, email: true } } } } } },
    },
  });
  if (!session) return null;
  const canReadPrivate = await hasStaffPermission(coachUserId, "ok:note:read_private");
  return { ...session, privateNote: canReadPrivate ? session.privateNote : null, canReadPrivate };
}

/** Web plan masası ile aynı süzgeçler: planlama haftası, onay akışındaki ürün, aktif koç ataması. */
export async function loadCoachPlans(coachUserId: string, now = new Date()) {
  const weekStart = planningWeekStart(now);
  const plans = await prisma.weeklyPlan.findMany({
    where: {
      weekStart: { gte: weekStart, lt: addIstanbulCalendarDays(weekStart, 7) },
      status: { in: ["DRAFT", "CHANGE_REQUESTED", "APPROVED"] },
      productRef: { requiresPlanApproval: true },
      student: { coachAssignments: { some: assignmentScope(coachUserId) } },
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
    select: {
      id: true,
      status: true,
      version: true,
      weekStart: true,
      studentId: true,
      student: { select: { user: { select: { fullName: true, email: true } } } },
      tasks: { where: { status: { not: "SKIPPED" } }, select: { status: true } },
    },
  });
  const suggestions = await prisma.weeklyPlanSuggestion.findMany({
    where: { status: "PENDING", student: { coachAssignments: { some: assignmentScope(coachUserId) } } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, studentId: true, title: true, rationale: true, kind: true, student: { select: { user: { select: { fullName: true, email: true } } } } },
  });
  return { weekStart, plans, suggestions };
}

export async function loadCoachPlanDetail(coachUserId: string, planId: string) {
  return prisma.weeklyPlan.findFirst({
    where: { id: planId, productRef: { requiresPlanApproval: true }, student: { coachAssignments: { some: assignmentScope(coachUserId) } } },
    select: {
      id: true,
      status: true,
      version: true,
      weekStart: true,
      studentId: true,
      student: { select: { user: { select: { fullName: true, email: true } } } },
      // Öğrenci görev notu, enerji / zorluk girdileri seçilmez.
      tasks: { where: { status: { not: "SKIPPED" } }, orderBy: [{ scheduledFor: "asc" }, { position: "asc" }], select: { id: true, title: true, subject: true, scheduledFor: true, durationMinutes: true, status: true } },
    },
  });
}
