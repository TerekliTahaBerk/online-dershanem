import "server-only";

import type { Prisma } from "@prisma/client";

export class GroupLifecycleError extends Error {
  code: "GROUP_NOT_FOUND" | "GROUP_INACTIVE" | "GROUP_CAPACITY_FULL" | "STUDENT_NOT_FOUND" | "ALREADY_ENROLLED" | "NOT_ENROLLED";

  constructor(code: GroupLifecycleError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function ensureActiveGroup(
  tx: Prisma.TransactionClient,
  groupId: string,
) {
  const group = await tx.group.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, isActive: true, capacity: true, teacherId: true },
  });
  if (!group) throw new GroupLifecycleError("GROUP_NOT_FOUND", "Grup bulunamadı.");
  if (!group.isActive) throw new GroupLifecycleError("GROUP_INACTIVE", "Kapalı gruba öğrenci işlemi yapılamaz.");
  return group;
}

export async function ensureActiveStudent(
  tx: Prisma.TransactionClient,
  studentId: string,
) {
  const student = await tx.studentProfile.findFirst({
    where: { id: studentId, user: { status: "ACTIVE" } },
    select: { id: true, userId: true, user: { select: { fullName: true, email: true } }, parents: { select: { parentId: true } } },
  });
  if (!student) throw new GroupLifecycleError("STUDENT_NOT_FOUND", "Öğrenci bulunamadı.");
  return student;
}

export async function assertGroupHasCapacity(
  tx: Prisma.TransactionClient,
  group: { id: string; capacity: number },
) {
  const activeCount = await tx.enrollment.count({
    where: { groupId: group.id, endedAt: null },
  });
  if (activeCount >= group.capacity) {
    throw new GroupLifecycleError("GROUP_CAPACITY_FULL", "Grup kapasitesi dolu.");
  }
  return activeCount;
}

export async function addStudentToGroup(
  tx: Prisma.TransactionClient,
  group: { id: string; capacity: number },
  studentId: string,
) {
  const enrollment = await tx.enrollment.findUnique({
    where: { groupId_studentId: { groupId: group.id, studentId } },
    select: { id: true, endedAt: true },
  });
  if (enrollment && !enrollment.endedAt) {
    throw new GroupLifecycleError("ALREADY_ENROLLED", "Öğrenci zaten bu grupta aktif.");
  }
  await assertGroupHasCapacity(tx, group);
  if (enrollment) {
    await tx.enrollment.update({
      where: { id: enrollment.id },
      data: { endedAt: null, startedAt: new Date() },
    });
  } else {
    await tx.enrollment.create({ data: { groupId: group.id, studentId } });
  }
}

export async function removeStudentFromGroup(
  tx: Prisma.TransactionClient,
  groupId: string,
  studentId: string,
) {
  const enrollment = await tx.enrollment.findUnique({
    where: { groupId_studentId: { groupId, studentId } },
    select: { id: true, endedAt: true },
  });
  if (!enrollment || enrollment.endedAt) {
    throw new GroupLifecycleError("NOT_ENROLLED", "Öğrenci bu grupta aktif değil.");
  }
  await tx.enrollment.update({
    where: { id: enrollment.id },
    data: { endedAt: new Date() },
  });
}

export async function transferStudentBetweenGroups(
  tx: Prisma.TransactionClient,
  sourceGroupId: string,
  targetGroup: { id: string; capacity: number },
  studentId: string,
) {
  const sourceEnrollment = await tx.enrollment.findUnique({
    where: { groupId_studentId: { groupId: sourceGroupId, studentId } },
    select: { id: true, endedAt: true },
  });
  if (!sourceEnrollment || sourceEnrollment.endedAt) {
    throw new GroupLifecycleError("NOT_ENROLLED", "Öğrenci kaynak grupta aktif değil.");
  }
  const targetEnrollment = await tx.enrollment.findUnique({
    where: { groupId_studentId: { groupId: targetGroup.id, studentId } },
    select: { id: true, endedAt: true },
  });
  if (targetEnrollment && !targetEnrollment.endedAt) {
    throw new GroupLifecycleError("ALREADY_ENROLLED", "Öğrenci hedef grupta zaten aktif.");
  }
  await assertGroupHasCapacity(tx, targetGroup);
  await tx.enrollment.update({
    where: { id: sourceEnrollment.id },
    data: { endedAt: new Date() },
  });
  if (targetEnrollment) {
    await tx.enrollment.update({
      where: { id: targetEnrollment.id },
      data: { endedAt: null, startedAt: new Date() },
    });
  } else {
    await tx.enrollment.create({ data: { groupId: targetGroup.id, studentId } });
  }
}
