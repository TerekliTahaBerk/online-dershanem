import "server-only";

import type { Prisma } from "@prisma/client";
import {
  buildTransferPreviewSummary,
  rangesOverlap,
  type ScheduleConflictSignal,
  type TransferBlockerCode,
  type TransferPreviewItem,
  type TransferPreviewSummary,
} from "@/lib/panel/group-360";

export class GroupLifecycleError extends Error {
  code:
    | "GROUP_NOT_FOUND"
    | "GROUP_INACTIVE"
    | "GROUP_CAPACITY_FULL"
    | "STUDENT_NOT_FOUND"
    | "ALREADY_ENROLLED"
    | "NOT_ENROLLED"
    | "TRANSFER_BLOCKED"
    | "SCHEDULE_CONFLICT";

  constructor(code: GroupLifecycleError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export const GROUP_MUTATION_ISOLATION = "Serializable" as const;

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
    select: {
      id: true,
      userId: true,
      user: { select: { fullName: true, email: true, status: true } },
      parents: { select: { parentId: true } },
    },
  });
  if (!student) throw new GroupLifecycleError("STUDENT_NOT_FOUND", "Öğrenci bulunamadı.");
  return student;
}

/** Kapasite sayımı için satır kilidi — concurrent transfer race'ini daraltır. */
export async function lockGroupRow(tx: Prisma.TransactionClient, groupId: string) {
  await tx.$queryRaw`SELECT id FROM groups WHERE id = ${groupId} FOR UPDATE`;
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
  await lockGroupRow(tx, group.id);
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

export async function findStudentScheduleConflicts(
  tx: Prisma.TransactionClient,
  input: {
    studentId: string;
    studentName: string;
    targetGroupId: string;
    excludeGroupId?: string;
    now?: Date;
  },
): Promise<ScheduleConflictSignal[]> {
  const now = input.now ?? new Date();
  const targetLessons = await tx.lesson.findMany({
    where: {
      groupId: input.targetGroupId,
      status: "PLANNED",
      startsAt: { gte: now },
    },
    select: { id: true, title: true, startsAt: true, endsAt: true },
    orderBy: { startsAt: "asc" },
    take: 40,
  });
  if (!targetLessons.length) return [];

  const otherEnrollments = await tx.enrollment.findMany({
    where: {
      studentId: input.studentId,
      endedAt: null,
      groupId: {
        notIn: [input.targetGroupId, ...(input.excludeGroupId ? [input.excludeGroupId] : [])],
      },
    },
    select: { groupId: true },
  });
  if (!otherEnrollments.length) return [];

  const otherGroupIds = otherEnrollments.map((row) => row.groupId);
  const windowEnd = targetLessons[targetLessons.length - 1]?.endsAt ?? now;
  const otherLessons = await tx.lesson.findMany({
    where: {
      groupId: { in: otherGroupIds },
      status: "PLANNED",
      startsAt: { lt: windowEnd },
      endsAt: { gt: now },
    },
    select: { id: true, title: true, startsAt: true, endsAt: true, groupId: true },
  });

  const conflicts: ScheduleConflictSignal[] = [];
  for (const target of targetLessons) {
    for (const other of otherLessons) {
      if (!rangesOverlap(target.startsAt, target.endsAt, other.startsAt, other.endsAt)) continue;
      conflicts.push({
        kind: "STUDENT",
        lessonId: target.id,
        lessonTitle: target.title,
        startsAt: target.startsAt,
        otherLessonId: other.id,
        otherLessonTitle: other.title,
        otherStartsAt: other.startsAt,
        studentId: input.studentId,
        studentName: input.studentName,
      });
    }
  }
  return conflicts;
}

export async function previewStudentTransfer(
  tx: Prisma.TransactionClient,
  input: {
    sourceGroupId: string;
    targetGroupId: string;
    studentIds: string[];
    now?: Date;
  },
): Promise<TransferPreviewSummary> {
  const now = input.now ?? new Date();
  if (input.sourceGroupId === input.targetGroupId) {
    return buildTransferPreviewSummary({
      targetGroupId: input.targetGroupId,
      targetGroupName: "",
      capacity: 0,
      activeCount: 0,
      items: input.studentIds.map((studentId) => ({
        studentId,
        studentName: studentId,
        blockers: [{ code: "SAME_GROUP", message: "Hedef grup kaynak gruptan farklı olmalı." }],
        warnings: [],
        affectedSourceLessons: [],
        affectedTargetLessons: [],
        conflicts: [],
      })),
    });
  }

  const [source, target] = await Promise.all([
    tx.group.findUnique({
      where: { id: input.sourceGroupId },
      select: { id: true, name: true, isActive: true, capacity: true },
    }),
    tx.group.findUnique({
      where: { id: input.targetGroupId },
      select: { id: true, name: true, isActive: true, capacity: true },
    }),
  ]);

  if (!target) {
    throw new GroupLifecycleError("GROUP_NOT_FOUND", "Hedef grup bulunamadı.");
  }

  const activeCount = await tx.enrollment.count({
    where: { groupId: target.id, endedAt: null },
  });

  const [sourceLessons, targetLessons] = await Promise.all([
    tx.lesson.findMany({
      where: { groupId: input.sourceGroupId, status: "PLANNED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 12,
      select: { id: true, title: true, startsAt: true },
    }),
    tx.lesson.findMany({
      where: { groupId: target.id, status: "PLANNED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 12,
      select: { id: true, title: true, startsAt: true },
    }),
  ]);

  const students = await tx.studentProfile.findMany({
    where: { id: { in: input.studentIds } },
    select: {
      id: true,
      user: { select: { fullName: true, email: true, status: true } },
      enrollments: {
        where: {
          groupId: { in: [input.sourceGroupId, target.id] },
          endedAt: null,
        },
        select: { groupId: true },
      },
    },
  });
  const byId = new Map(students.map((student) => [student.id, student]));

  const items: TransferPreviewItem[] = [];
  for (const studentId of input.studentIds) {
    const student = byId.get(studentId);
    const studentName = student?.user.fullName || student?.user.email || studentId;
    const blockers: Array<{ code: TransferBlockerCode; message: string }> = [];
    const warnings: string[] = [];

    if (!source?.isActive) {
      blockers.push({ code: "SOURCE_INACTIVE", message: "Kaynak grup kapalı." });
    }
    if (!target.isActive) {
      blockers.push({ code: "TARGET_INACTIVE", message: "Hedef grup kapalı." });
    }
    if (!student || student.user.status !== "ACTIVE") {
      blockers.push({ code: "STUDENT_INACTIVE", message: "Öğrenci aktif değil veya arşivlenmiş." });
    } else {
      const enrolledSource = student.enrollments.some((row) => row.groupId === input.sourceGroupId);
      const enrolledTarget = student.enrollments.some((row) => row.groupId === target.id);
      if (!enrolledSource) {
        blockers.push({ code: "NOT_ENROLLED", message: "Öğrenci kaynak grupta aktif değil." });
      }
      if (enrolledTarget) {
        blockers.push({ code: "ALREADY_IN_TARGET", message: "Öğrenci hedef grupta zaten aktif." });
      }
    }

    const conflicts =
      student && student.user.status === "ACTIVE" && blockers.length === 0
        ? await findStudentScheduleConflicts(tx, {
            studentId,
            studentName,
            targetGroupId: target.id,
            excludeGroupId: input.sourceGroupId,
            now,
          })
        : [];

    if (conflicts.length) {
      blockers.push({
        code: "STUDENT_SCHEDULE_CONFLICT",
        message: `Hedef programda ${conflicts.length} öğrenci çakışması var.`,
      });
    }

    if (!sourceLessons.length) {
      warnings.push("Kaynak grupta yaklaşan planlı ders yok.");
    }
    if (!targetLessons.length) {
      warnings.push("Hedef grupta yaklaşan planlı ders yok.");
    }

    items.push({
      studentId,
      studentName,
      blockers,
      warnings,
      affectedSourceLessons: sourceLessons,
      affectedTargetLessons: targetLessons,
      conflicts,
    });
  }

  return buildTransferPreviewSummary({
    targetGroupId: target.id,
    targetGroupName: target.name,
    capacity: target.capacity,
    activeCount,
    items,
  });
}

export async function transferStudentBetweenGroups(
  tx: Prisma.TransactionClient,
  sourceGroupId: string,
  targetGroup: { id: string; capacity: number },
  studentId: string,
) {
  await lockGroupRow(tx, targetGroup.id);
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

  const student = await ensureActiveStudent(tx, studentId);
  const studentName = student.user.fullName || student.user.email;
  const conflicts = await findStudentScheduleConflicts(tx, {
    studentId,
    studentName,
    targetGroupId: targetGroup.id,
    excludeGroupId: sourceGroupId,
  });
  if (conflicts.length) {
    throw new GroupLifecycleError(
      "SCHEDULE_CONFLICT",
      "Transfer hedef programıyla öğrenci takviminde çakışma var.",
    );
  }

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

export async function transferStudentsBetweenGroups(
  tx: Prisma.TransactionClient,
  sourceGroupId: string,
  targetGroupId: string,
  studentIds: string[],
) {
  const targetGroup = await ensureActiveGroup(tx, targetGroupId);
  await ensureActiveGroup(tx, sourceGroupId);
  await lockGroupRow(tx, targetGroup.id);

  const preview = await previewStudentTransfer(tx, {
    sourceGroupId,
    targetGroupId,
    studentIds,
  });
  if (!preview.canExecute) {
    const firstBlocker = preview.items.flatMap((item) => item.blockers)[0];
    throw new GroupLifecycleError(
      firstBlocker?.code === "TARGET_CAPACITY"
        ? "GROUP_CAPACITY_FULL"
        : firstBlocker?.code === "STUDENT_SCHEDULE_CONFLICT"
          ? "SCHEDULE_CONFLICT"
          : "TRANSFER_BLOCKED",
      firstBlocker?.message || "Transfer önizlemesi engellendi.",
    );
  }

  for (const studentId of studentIds) {
    await transferStudentBetweenGroups(tx, sourceGroupId, targetGroup, studentId);
  }
  return preview;
}
