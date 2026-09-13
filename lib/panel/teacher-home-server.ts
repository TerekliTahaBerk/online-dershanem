import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildTeacherHomeSnapshot,
  teacherHomeSnapshotSchema,
  type TeacherHomeSnapshot,
  type TeacherHomeSourceData,
} from "./teacher-home-data";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";

export async function getTeacherHomeSnapshot(teacherId: string): Promise<TeacherHomeSnapshot | null> {
  const row = await prisma.teacherHomeSnapshot.findUnique({
    where: { teacherId },
    select: { snapshot: true },
  });
  if (!row) return null;

  const parsed = teacherHomeSnapshotSchema.safeParse(row.snapshot);
  return parsed.success ? parsed.data : null;
}

async function loadTeacherHomeSourceData(teacherId: string, now: Date): Promise<TeacherHomeSourceData> {
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [todayLessons, awaitingNotes] = await Promise.all([
    prisma.lesson.findMany({
      where: { teacherId, startsAt: { gte: dayStart, lt: dayEnd } },
      orderBy: { startsAt: "asc" },
      select: {
        id: true,
        startsAt: true,
        title: true,
        group: {
          select: {
            name: true,
            enrollments: { where: { endedAt: null }, select: { id: true } },
          },
        },
        notes: { where: { studentId: null }, select: { id: true } },
      },
    }),
    prisma.lesson.findMany({
      where: {
        teacherId,
        startsAt: { lt: now, gte: twoWeeksAgo },
        notes: { none: { studentId: null } },
      },
      orderBy: { startsAt: "desc" },
      take: 6,
      select: {
        id: true,
        startsAt: true,
          group: { select: { name: true } },
      },
    }),
  ]);

  return {
    now,
    todayLessons: todayLessons.map((lesson) => ({
      id: lesson.id,
      startsAt: lesson.startsAt,
      title: lesson.title,
      groupName: lesson.group.name,
      studentCount: lesson.group.enrollments.length,
      hasPendingNote: lesson.notes.length === 0,
    })),
    awaitingNotes: awaitingNotes.map((lesson) => ({
      id: lesson.id,
      startsAt: lesson.startsAt,
      groupName: lesson.group.name,
    })),
    groups: [],
    attendance: [],
    assignmentProgress: [],
  };
}

export async function refreshTeacherHomeSnapshot(teacherId: string): Promise<TeacherHomeSnapshot> {
  const now = new Date();
  const snapshot = buildTeacherHomeSnapshot(await loadTeacherHomeSourceData(teacherId, now));
  await prisma.teacherHomeSnapshot.upsert({
    where: { teacherId },
    create: { teacherId, generatedAt: now, snapshot },
    update: { generatedAt: now, snapshot },
  });
  return snapshot;
}

export async function refreshAllTeacherHomeSnapshots() {
  const teachers = await prisma.user.findMany({
    where: {
      role: "TEACHER",
      status: "ACTIVE",
      OR: [{ taughtGroups: { some: { isActive: true } } }, { taughtLessons: { some: { status: { not: "CANCELLED" } } } }],
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  for (const teacher of teachers) {
    await refreshTeacherHomeSnapshot(teacher.id);
  }

  return teachers.length;
}

export async function getOrRefreshTeacherHomeSnapshot(teacherId: string): Promise<TeacherHomeSnapshot> {
  const snapshot = await getTeacherHomeSnapshot(teacherId);
  if (snapshot) return snapshot;
  return refreshTeacherHomeSnapshot(teacherId);
}
