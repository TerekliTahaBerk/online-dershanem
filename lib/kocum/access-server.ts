import "server-only";

import { prisma } from "@/lib/prisma";
import { findCoachAssignmentForCoach } from "@/lib/panel/coaching";

/**
 * Online Koçum yatay erişim — sunucu tarafı.
 * Student: kendi planı. Parent: bağlı öğrenci. Teacher/Coach: atanan. Admin: tümü.
 */

export async function assertStudentOwnsProfile(userId: string, studentProfileId: string) {
  const profile = await prisma.studentProfile.findFirst({
    where: { id: studentProfileId, userId },
    select: { id: true },
  });
  return Boolean(profile);
}

export async function assertParentLinkedToStudent(parentUserId: string, studentProfileId: string) {
  const link = await prisma.parentStudent.findFirst({
    where: { parentId: parentUserId, studentId: studentProfileId },
    select: { id: true },
  });
  return Boolean(link);
}

export async function assertCoachOrTeacherAccess(input: {
  role: "ADMIN" | "TEACHER";
  userId: string;
  studentProfileId: string;
}): Promise<boolean> {
  if (input.role === "ADMIN") return true;

  const coach = await findCoachAssignmentForCoach(input.userId, input.studentProfileId);
  if (coach) return true;

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentId: input.studentProfileId,
      endedAt: null,
      group: { isActive: true, teacherId: input.userId },
    },
    select: { id: true },
  });
  return Boolean(enrollment);
}

export async function loadPlanTaskForStudentMutation(taskId: string, studentUserId: string) {
  return prisma.weeklyPlanTask.findFirst({
    where: {
      id: taskId,
      plan: { student: { userId: studentUserId }, status: "APPROVED" },
    },
    select: {
      id: true,
      status: true,
      sourceType: true,
      sourceReferenceId: true,
      taskKind: true,
      planId: true,
      plan: { select: { id: true, studentId: true, version: true, status: true } },
    },
  });
}

export async function loadPlanTaskForStaffMutation(taskId: string) {
  return prisma.weeklyPlanTask.findFirst({
    where: { id: taskId },
    select: {
      id: true,
      status: true,
      scheduledFor: true,
      planId: true,
      title: true,
      plan: {
        select: {
          id: true,
          studentId: true,
          version: true,
          status: true,
          weekStart: true,
        },
      },
    },
  });
}
