import "server-only";

import type { Prisma } from "@prisma/client";
import {
  classifyLessonConflict,
  rangesOverlap,
  type ScheduleConflictKind,
  type ScheduleConflictSignal,
} from "@/lib/panel/group-360";

export type LessonScope = "ONE" | "FOLLOWING";

export class LessonLifecycleError extends Error {
  code:
    | "LESSON_NOT_FOUND"
    | "TEACHER_NOT_FOUND"
    | "SCOPE_NOT_AVAILABLE"
    | "SCHEDULE_CONFLICT";

  constructor(code: LessonLifecycleError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

export async function resolveScopedLessons(
  tx: Prisma.TransactionClient,
  lessonId: string,
  scope: LessonScope,
) {
  const lesson = await tx.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      groupId: true,
      teacherId: true,
      title: true,
      meetingUrl: true,
      startsAt: true,
      endsAt: true,
      status: true,
      seriesId: true,
    },
  });
  if (!lesson) throw new LessonLifecycleError("LESSON_NOT_FOUND", "Ders bulunamadı.");

  if (scope === "ONE" || !lesson.seriesId) return [lesson];

  const seriesLessons = await tx.lesson.findMany({
    where: { seriesId: lesson.seriesId, startsAt: { gte: lesson.startsAt } },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      groupId: true,
      teacherId: true,
      title: true,
      meetingUrl: true,
      startsAt: true,
      endsAt: true,
      status: true,
      seriesId: true,
    },
  });
  return seriesLessons;
}

export async function assertTeacherActive(
  tx: Prisma.TransactionClient,
  teacherId: string,
) {
  const teacher = await tx.user.findFirst({
    where: { id: teacherId, role: "TEACHER", status: "ACTIVE" },
    select: { id: true, fullName: true, email: true },
  });
  if (!teacher) throw new LessonLifecycleError("TEACHER_NOT_FOUND", "Aktif öğretmen bulunamadı.");
  return teacher;
}

export type LessonConflictCandidate = {
  id: string;
  title: string;
  startsAt: Date;
  endsAt: Date;
  teacherId: string;
  groupId: string;
};

/**
 * Öğretmen, aynı grup ve (opsiyonel) öğrenci çakışmalarını tarar.
 * `studentIds` verilirse o öğrencilerin diğer gruplarındaki planlı dersleri de kontrol edilir.
 */
export async function findLessonScheduleConflicts(
  tx: Prisma.TransactionClient,
  input: {
    lessonId: string;
    excludeIds?: string[];
    teacherId: string;
    groupId: string;
    startsAt: Date;
    endsAt: Date;
    studentIds?: string[];
  },
): Promise<ScheduleConflictSignal[]> {
  const exclude = new Set([input.lessonId, ...(input.excludeIds || [])]);
  const overlaps = await tx.lesson.findMany({
    where: {
      id: { notIn: [...exclude] },
      status: "PLANNED",
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
      OR: [{ teacherId: input.teacherId }, { groupId: input.groupId }],
    },
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      teacherId: true,
      groupId: true,
    },
  });

  const conflicts: ScheduleConflictSignal[] = [];
  for (const other of overlaps) {
    const kinds = classifyLessonConflict({
      teacherId: input.teacherId,
      groupId: input.groupId,
      otherTeacherId: other.teacherId,
      otherGroupId: other.groupId,
    });
    for (const kind of kinds) {
      conflicts.push({
        kind,
        lessonId: input.lessonId,
        lessonTitle: "",
        startsAt: input.startsAt,
        otherLessonId: other.id,
        otherLessonTitle: other.title,
        otherStartsAt: other.startsAt,
      });
    }
  }

  if (input.studentIds?.length) {
    const otherEnrollments = await tx.enrollment.findMany({
      where: {
        studentId: { in: input.studentIds },
        endedAt: null,
        groupId: { not: input.groupId },
      },
      select: {
        studentId: true,
        groupId: true,
        student: { select: { user: { select: { fullName: true, email: true } } } },
      },
    });
    const otherGroupIds = [...new Set(otherEnrollments.map((row) => row.groupId))];
    if (otherGroupIds.length) {
      const otherLessons = await tx.lesson.findMany({
        where: {
          groupId: { in: otherGroupIds },
          status: "PLANNED",
          startsAt: { lt: input.endsAt },
          endsAt: { gt: input.startsAt },
          id: { notIn: [...exclude] },
        },
        select: { id: true, title: true, startsAt: true, endsAt: true, groupId: true },
      });
      for (const other of otherLessons) {
        if (!rangesOverlap(input.startsAt, input.endsAt, other.startsAt, other.endsAt)) continue;
        const hit = otherEnrollments.filter((row) => row.groupId === other.groupId);
        for (const enrollment of hit) {
          conflicts.push({
            kind: "STUDENT",
            lessonId: input.lessonId,
            lessonTitle: "",
            startsAt: input.startsAt,
            otherLessonId: other.id,
            otherLessonTitle: other.title,
            otherStartsAt: other.startsAt,
            studentId: enrollment.studentId,
            studentName:
              enrollment.student.user.fullName || enrollment.student.user.email,
          });
        }
      }
    }
  }

  return conflicts;
}

export async function assertLessonNoConflict(
  tx: Prisma.TransactionClient,
  input: {
    lessonId: string;
    excludeIds?: string[];
    teacherId: string;
    groupId: string;
    startsAt: Date;
    endsAt: Date;
    studentIds?: string[];
  },
) {
  const conflicts = await findLessonScheduleConflicts(tx, input);
  if (conflicts.length) {
    const kindLabels: Record<ScheduleConflictKind, string> = {
      TEACHER: "öğretmen",
      GROUP: "grup",
      STUDENT: "öğrenci",
    };
    const kinds = [...new Set(conflicts.map((item) => kindLabels[item.kind]))].join(", ");
    throw new LessonLifecycleError(
      "SCHEDULE_CONFLICT",
      `Planlanan saat başka bir ders ile çakışıyor (${kinds}).`,
    );
  }
}

/** Grup 360 program sekmesi: yaklaşan dersler arasındaki açık çakışmalar. */
export async function findOpenGroupScheduleConflicts(
  tx: Prisma.TransactionClient,
  groupId: string,
  now = new Date(),
): Promise<ScheduleConflictSignal[]> {
  const upcoming = await tx.lesson.findMany({
    where: { groupId, status: "PLANNED", startsAt: { gte: now } },
    orderBy: { startsAt: "asc" },
    take: 24,
    select: {
      id: true,
      title: true,
      startsAt: true,
      endsAt: true,
      teacherId: true,
      groupId: true,
    },
  });

  const enrollments = await tx.enrollment.findMany({
    where: { groupId, endedAt: null },
    select: { studentId: true },
  });
  const studentIds = enrollments.map((row) => row.studentId);

  const all: ScheduleConflictSignal[] = [];
  for (const lesson of upcoming) {
    const found = await findLessonScheduleConflicts(tx, {
      lessonId: lesson.id,
      teacherId: lesson.teacherId,
      groupId: lesson.groupId,
      startsAt: lesson.startsAt,
      endsAt: lesson.endsAt,
      studentIds,
    });
    for (const conflict of found) {
      all.push({
        ...conflict,
        lessonTitle: lesson.title,
      });
    }
  }

  // Aynı çiftleri tekilleştir
  const seen = new Set<string>();
  return all.filter((conflict) => {
    const key = [
      conflict.kind,
      conflict.lessonId,
      conflict.otherLessonId,
      conflict.studentId || "",
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
