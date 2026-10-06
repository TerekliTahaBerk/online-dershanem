import "server-only";

import { prisma } from "@/lib/prisma";
import { findCoachAssignmentForCoach } from "@/lib/panel/coaching";

/**
 * Online Koçum yatay erişim — sunucu tarafı.
 * Student: kendi planı. Parent: bağlı öğrenci (akademik izinli). Koç: aktif
 * `CoachAssignment`. OD öğretmeni Yön yazma yetkisi taşımaz. Admin: tümü.
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
    where: { parentId: parentUserId, studentId: studentProfileId, active: true, endedAt: null, canViewAcademic: true },
    select: { id: true },
  });
  return Boolean(link);
}

/**
 * YÖN (Online Koçum) yazma yetkisi — TEK kapı.
 *
 * Koçluğa özgü her yazma (not, görev, plan kopyalama, şablon, öneri inceleme,
 * haftalık özet, plan onayı) yalnız şu aktörlere açıktır:
 *  - ADMIN
 *  - öğrencinin AKTİF (`endedAt = null`) `CoachAssignment` kaydındaki koçu
 *
 * OD grup öğretmeni olmak bu yetkiyi VERMEZ. Eskiden "aktif grup kaydı" da
 * koç ataması gibi kabul ediliyordu; matematik öğretmeni grubundaki her
 * öğrencinin Yön planını, notlarını ve özetini değiştirebiliyordu.
 * OD akışları (ders, ödev, materyal, Öğrenci 360) `assertOdTeacherOfStudent`
 * veya `lib/panel/teacher-scope.ts` ile ayrı korunur.
 */
export async function assertAssignedCoach(input: {
  role: "ADMIN" | "TEACHER";
  userId: string;
  studentProfileId: string;
}): Promise<boolean> {
  if (input.role === "ADMIN") return true;
  return Boolean(await findCoachAssignmentForCoach(input.userId, input.studentProfileId));
}

/**
 * OD öğretmen kapsamı: öğrenci bu öğretmenin aktif bir grubunda aktif kayıtlı mı?
 * Yalnız OD verisi için kullanılır; Yön yazma yetkisi VERMEZ (bkz. `assertAssignedCoach`).
 */
export async function assertOdTeacherOfStudent(input: {
  role: "ADMIN" | "TEACHER";
  userId: string;
  studentProfileId: string;
}): Promise<boolean> {
  if (input.role === "ADMIN") return true;
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
