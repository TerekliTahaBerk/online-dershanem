import "server-only";

import { prisma } from "@/lib/prisma";
import { getStudentCoaching } from "@/lib/panel/coaching";
import { coachingAssignmentScope, type CoachingActor } from "@/lib/coaching-experience-server";
import { addIstanbulCalendarDays, istanbulWeekStart } from "@/lib/istanbul-time";

/**
 * Koçum — okuma tarafı TEK yerde. `app/panel/ogrenci/kocluk/page.tsx`,
 * `CoachingSessions` bileşeni ve `GET /api/panel/student/coaching` aynı
 * sorguları kullanır.
 *
 * GİZLİLİK: `privateNote` hiçbir sorguda SEÇİLMEZ; koç notlarından yalnız
 * STUDENT_VISIBLE / PARENT_VISIBLE olanlar okunur (`canViewerSeeCoachNote`).
 * Koçun eklediği çalışmalar yalnız onaylı (yayında) plandan gelir.
 */

/**
 * Yaklaşan (PLANNED) görüşmeler — `CoachingSessions` ile aynı kapsam
 * (`coachingAssignmentScope`: aktif OK üyeliği, rol ilişkisi).
 */
export async function loadUpcomingCoachingSessions(actor: CoachingActor, studentId: string) {
  const assignment = await prisma.coachAssignment.findFirst({
    where: { ...coachingAssignmentScope(actor), studentId },
    select: {
      id: true,
      sessions: {
        where: { status: "PLANNED" },
        orderBy: { scheduledAt: "asc" },
        take: 10,
        select: { id: true, version: true, scheduledAt: true, meetingUrl: true, rescheduleRequestedAt: true, rescheduleReason: true, proposedAt: true },
      },
    },
  });
  return assignment ? assignment.sessions : null;
}

export async function loadStudentCoachingHub(input: { userId: string; adaptivePlanEnabled: boolean; now?: Date }) {
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: input.userId },
    select: { id: true },
  });
  if (!profile) return null;

  const weekStart = istanbulWeekStart(input.now ?? new Date());
  const [coaching, notes, pastSessions, coachTasks] = await Promise.all([
    getStudentCoaching(profile.id),
    prisma.coachNote.findMany({
      where: { studentId: profile.id, visibility: { in: ["STUDENT_VISIBLE", "PARENT_VISIBLE"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, body: true, createdAt: true },
    }),
    prisma.coachingSession.findMany({
      where: { status: { not: "PLANNED" }, assignment: { studentId: profile.id } },
      orderBy: { scheduledAt: "desc" },
      take: 8,
      // privateNote BİLEREK seçilmiyor.
      select: { id: true, scheduledAt: true, completedAt: true, status: true, focus: true, sharedNote: true },
    }),
    input.adaptivePlanEnabled
      ? prisma.weeklyPlanTask.findMany({
          where: {
            sourceType: "MANUAL_COACH",
            status: { not: "SKIPPED" },
            scheduledFor: { gte: weekStart, lt: addIstanbulCalendarDays(weekStart, 7) },
            plan: { studentId: profile.id, status: "APPROVED" },
          },
          orderBy: [{ scheduledFor: "asc" }, { position: "asc" }],
          select: { id: true, title: true, scheduledFor: true, durationMinutes: true, status: true },
        })
      : Promise.resolve([]),
  ]);

  // Ortak notlar: görünür koç notları + görüşmelerin paylaşılan notu, en yeni önce.
  const sharedNotes = [
    ...notes.map((note) => ({ id: `note:${note.id}`, body: note.body, at: note.createdAt })),
    ...pastSessions
      .filter((item) => item.sharedNote)
      .map((item) => ({ id: `session:${item.id}`, body: item.sharedNote!, at: item.completedAt ?? item.scheduledAt })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  return { profile, coaching, sharedNotes, pastSessions, coachTasks };
}
