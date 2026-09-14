import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const offboardingSchema = z.object({
  transferTeacherId: z.string().min(1), transferCoachTeacherId: z.string().min(1).optional(),
  transferInterventionOwnerId: z.string().min(1).optional(),
});

export const bulkUserOperationSchema = z.object({
  mode: z.enum(["PREVIEW", "EXECUTE"]),
  action: z.enum(["RESEND_INVITE", "TRANSFER_STUDENTS_TO_GROUP", "OFFBOARD_TEACHERS"]),
  filters: z.object({ q: z.string().optional(), rol: z.string().optional(), urun: z.string().optional(), durum: z.string().optional() }).optional(),
  options: z.object({ targetGroupId: z.string().min(1).optional(), transferTeacherId: z.string().min(1).optional(), transferCoachTeacherId: z.string().min(1).optional(), transferInterventionOwnerId: z.string().min(1).optional() }).optional(),
});

export type OffboardingSnapshot = {
  teacher: { id: string; email: string; fullName: string | null; status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"; profile: { id: string; isCoach: boolean; subjects: string[]; coachCapacity: number | null } | null };
  counts: { activeGroups: number; upcomingLessons: number; pendingLessonClosures: number; openHelpRequests: number; coachAssignments: number; openInterventions: number };
};

export async function loadOffboardingSnapshot(teacherId: string, now: Date): Promise<OffboardingSnapshot | null> {
  const teacher = await prisma.user.findFirst({ where: { id: teacherId, role: "TEACHER" }, select: { id: true, email: true, fullName: true, status: true, teacherProfile: { select: { id: true, isCoach: true, subjects: true, coachCapacity: true } } } });
  if (!teacher) return null;
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const [activeGroups, upcomingLessons, pendingLessonClosures, openHelpRequests, openInterventions, coachAssignments] = await Promise.all([
    prisma.group.count({ where: { teacherId, isActive: true } }),
    prisma.lesson.count({ where: { teacherId, status: "PLANNED", startsAt: { gte: now } } }),
    prisma.lesson.count({ where: { teacherId, startsAt: { lt: now, gte: twoWeeksAgo }, status: { in: ["PLANNED", "COMPLETED"] }, notes: { none: { studentId: null } } } }),
    prisma.studentHelpRequest.count({ where: { status: "OPEN", group: { teacherId, isActive: true } } }),
    prisma.interventionCase.count({ where: { ownerId: teacherId, status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] } } }),
    teacher.teacherProfile?.isCoach ? prisma.coachAssignment.count({ where: { coachId: teacher.teacherProfile.id, endedAt: null } }) : Promise.resolve(0),
  ]);
  return { teacher: { id: teacher.id, email: teacher.email, fullName: teacher.fullName, status: teacher.status, profile: teacher.teacherProfile }, counts: { activeGroups, upcomingLessons, pendingLessonClosures, openHelpRequests, coachAssignments, openInterventions } };
}

export function buildOffboardingBlockers(snapshot: OffboardingSnapshot) {
  const blockers: Array<{ code: string; label: string; count: number }> = [];
  if (snapshot.counts.coachAssignments > 0) blockers.push({ code: "coach_assignments", label: "Aktif koç atamaları devredilmeli", count: snapshot.counts.coachAssignments });
  if (snapshot.counts.openInterventions > 0) blockers.push({ code: "open_interventions", label: "Açık müdahale sahiplikleri devredilmeli", count: snapshot.counts.openInterventions });
  return blockers;
}

export type BulkTeacherSnapshot = { id: string; email: string; status: "ACTIVE" | "SUSPENDED" | "ARCHIVED"; profileId: string | null; isCoach: boolean; counts: { coachAssignments: number; openInterventions: number } };

export async function loadBulkTeacherSnapshot(teacherId: string): Promise<BulkTeacherSnapshot | null> {
  const teacher = await prisma.user.findFirst({ where: { id: teacherId, role: "TEACHER" }, select: { id: true, email: true, status: true, teacherProfile: { select: { id: true, isCoach: true } } } });
  if (!teacher) return null;
  const [coachAssignments, openInterventions] = await Promise.all([
    teacher.teacherProfile?.isCoach ? prisma.coachAssignment.count({ where: { coachId: teacher.teacherProfile.id, endedAt: null } }) : Promise.resolve(0),
    prisma.interventionCase.count({ where: { ownerId: teacher.id, status: { in: ["OPEN", "IN_PROGRESS", "SNOOZED"] } } }),
  ]);
  return { id: teacher.id, email: teacher.email, status: teacher.status, profileId: teacher.teacherProfile?.id ?? null, isCoach: teacher.teacherProfile?.isCoach ?? false, counts: { coachAssignments, openInterventions } };
}
