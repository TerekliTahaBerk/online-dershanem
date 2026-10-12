import "server-only";
import { prisma } from "@/lib/prisma";
import type { AdminCoaching } from "@/lib/mobile-contracts/admin-coaching";
import { coachAssignmentRevision } from "./coach-assignment-core";
import { loadAdminCoaching } from "./admin-coaching-server";

const name = (user: { fullName: string | null; email: string }) => user.fullName || user.email;

export async function adminCoachingProjection(): Promise<AdminCoaching> {
  const data = await loadAdminCoaching();
  const students: AdminCoaching['students'] = [
    ...data.assignments.map((assignment) => {
      const row = data.rows.find((item) => item.id === assignment.id)!;
      return { id: assignment.student.id, name: row.studentName, coachId: assignment.coach.id, coachName: row.coachName, revision: coachAssignmentRevision(assignment), cadenceDays: assignment.cadenceDays, lastCompletedAt: row.lastCompleted?.toISOString() ?? null, nextAt: row.next?.toISOString() ?? null, overdue: row.overdue };
    }),
    ...data.unassigned.map((student) => ({ id: student.id, name: name(student.user), coachId: null, coachName: null, revision: coachAssignmentRevision(null), cadenceDays: null, lastCompletedAt: null, nextAt: null, overdue: false })),
  ];
  const queueRow = (studentId: string, detail: string, id = studentId) => ({ id, studentId, title: students.find((s) => s.id === studentId)?.name ?? studentId, detail });
  return {
    contractVersion: 1,
    students,
    coaches: data.coaches.map((coach) => ({ id: coach.id, name: name(coach.user), capacity: coach.coachCapacity, load: coach._count.coachAssignments, today: data.coachStats.get(coach.id)?.today ?? 0, overdue: data.coachStats.get(coach.id)?.overdue ?? 0, assignable: coach.user.status === 'ACTIVE' && coach.user.role === 'TEACHER' })),
    queues: [
      { id: 'koc-bekleyen', label: 'Koç bekleyen', count: data.unassigned.length, rows: data.unassigned.map((s) => queueRow(s.id, 'Aktif Yön Koçluk üyesi · koç atanmadı')) },
      { id: 'geciken', label: 'Görüşme gecikti', count: data.overdueRows.length, rows: data.overdueRows.map((s) => queueRow(s.studentId, `${s.coachName} · Görüşme ${s.overdueDays ?? ''} gün gecikti`)) },
      ...(data.adaptivePlanEnabled ? [{ id: 'plansiz' as const, label: 'Plan yayınlanmadı', count: data.studentsWithoutPlan.length, rows: data.studentsWithoutPlan.map((s) => queueRow(s.student.id, name(s.coach.user))) }] : []),
      { id: 'hedefsiz', label: 'Hedefi olmayan', count: data.studentsWithoutGoals.length, rows: data.studentsWithoutGoals.map((s) => queueRow(s.student.id, name(s.coach.user))) },
      { id: 'kapasite', label: 'Kapasite üstü koçlar', count: data.overCapacity.length, rows: data.overCapacity.map((c) => ({ id: c.id, studentId: null, title: name(c.user), detail: `${c._count.coachAssignments} / ${c.coachCapacity} öğrenci` })) },
      { id: 'sinyaller', label: 'Yön sinyalleri', count: data.kocumSignals.length, rows: data.kocumSignals.map((s) => ({ id: `${s.code}-${s.studentId}`, studentId: s.studentId, title: s.studentName, detail: s.detail })) },
      { id: 'tum-ogrenciler', label: 'Tüm öğrenciler', count: students.length, rows: students.map((s) => queueRow(s.id, s.coachName ?? 'Koç atanmadı')) },
    ],
    sessions: data.assignments.flatMap((a) => a.sessions.map((s) => ({ id: s.id, studentId: a.student.id, studentName: name(a.student.user), coachName: name(a.coach.user), scheduledAt: s.scheduledAt.toISOString(), completedAt: s.completedAt?.toISOString() ?? null, status: s.status, focus: s.focus }))).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
  };
}

/** Özel koç notu yönetim projeksiyonuna da alınmaz; ortak not ve görüşme bilgisi yeterlidir. */
export async function adminCoachingSessionProjection(id: string) {
  const row = await prisma.coachingSession.findUnique({ where: { id }, select: {
    id: true, status: true, scheduledAt: true, completedAt: true, focus: true, sharedNote: true, meetingUrl: true, proposedAt: true, rescheduleRequestedAt: true, rescheduleReason: true,
    assignment: { select: { studentId: true, student: { select: { user: { select: { fullName: true, email: true } } } }, coach: { select: { user: { select: { fullName: true, email: true } } } } } },
  } });
  if (!row) return null;
  return { contractVersion: 1, session: { id: row.id, studentId: row.assignment.studentId, studentName: name(row.assignment.student.user), coachName: name(row.assignment.coach.user), status: row.status, scheduledAt: row.scheduledAt.toISOString(), completedAt: row.completedAt?.toISOString() ?? null, focus: row.focus }, sharedNote: row.sharedNote, meetingUrl: row.meetingUrl, proposedAt: row.proposedAt?.toISOString() ?? null, rescheduleRequestedAt: row.rescheduleRequestedAt?.toISOString() ?? null, rescheduleReason: row.rescheduleReason };
}
