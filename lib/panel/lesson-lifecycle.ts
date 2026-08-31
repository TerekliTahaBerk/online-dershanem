import "server-only";

import type { Prisma } from "@prisma/client";

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
    select: { id: true, groupId: true, teacherId: true, title: true, meetingUrl: true, startsAt: true, endsAt: true, status: true, seriesId: true },
  });
  if (!lesson) throw new LessonLifecycleError("LESSON_NOT_FOUND", "Ders bulunamadı.");

  if (scope === "ONE" || !lesson.seriesId) return [lesson];

  const seriesLessons = await tx.lesson.findMany({
    where: { seriesId: lesson.seriesId, startsAt: { gte: lesson.startsAt } },
    orderBy: { startsAt: "asc" },
    select: { id: true, groupId: true, teacherId: true, title: true, meetingUrl: true, startsAt: true, endsAt: true, status: true, seriesId: true },
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

export async function assertLessonNoConflict(
  tx: Prisma.TransactionClient,
  input: {
    lessonId: string;
    excludeIds?: string[];
    teacherId: string;
    groupId: string;
    startsAt: Date;
    endsAt: Date;
  },
) {
  const conflict = await tx.lesson.findFirst({
    where: {
      id: {
        notIn: [input.lessonId, ...(input.excludeIds || [])],
      },
      status: "PLANNED",
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
      OR: [{ teacherId: input.teacherId }, { groupId: input.groupId }],
    },
    select: { id: true, title: true, startsAt: true },
  });
  if (conflict) {
    throw new LessonLifecycleError(
      "SCHEDULE_CONFLICT",
      "Planlanan saat başka bir ders ile çakışıyor.",
    );
  }
}
