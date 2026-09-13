import { z } from "zod";

export type TeacherHomeLesson = {
  id: string;
  startsAt: string;
  title: string;
  groupName: string;
  studentCount: number;
  hasPendingNote: boolean;
};

export type TeacherHomeAwaitingNote = {
  id: string;
  startsAt: string;
  groupName: string;
};

export type TeacherHomeFlag = {
  id: string;
  name: string;
  group: string;
  reason: string;
};

export type TeacherHomeSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  summary: string;
  counts: {
    todayLessons: number;
    awaitingNotes: number;
    flags: number;
  };
  todayLessons: TeacherHomeLesson[];
  awaitingNotes: TeacherHomeAwaitingNote[];
  flags: TeacherHomeFlag[];
};

export type TeacherHomeSourceGroup = {
  id: string;
  name: string;
  students: Array<{
    id: string;
    name: string;
  }>;
};

export type TeacherHomeSourceLesson = {
  id: string;
  startsAt: Date;
  title: string;
  groupName: string;
  studentCount: number;
  hasPendingNote: boolean;
};

export type TeacherHomeSourceAwaitingNote = {
  id: string;
  startsAt: Date;
  groupName: string;
};

export type TeacherHomeSourceData = {
  now?: Date;
  todayLessons: TeacherHomeSourceLesson[];
  awaitingNotes: TeacherHomeSourceAwaitingNote[];
  groups: TeacherHomeSourceGroup[];
  attendance: Array<{ studentId: string; status: string }>;
  assignmentProgress: Array<{ studentId: string; status: string }>;
};

const lessonSchema = z.object({
  id: z.string().min(1),
  startsAt: z.string().min(1),
  title: z.string().min(1),
  groupName: z.string().min(1),
  studentCount: z.number().int().nonnegative(),
  hasPendingNote: z.boolean(),
});

const awaitingNoteSchema = z.object({
  id: z.string().min(1),
  startsAt: z.string().min(1),
  groupName: z.string().min(1),
});

const flagSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  group: z.string().min(1),
  reason: z.string().min(1),
});

export const teacherHomeSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  summary: z.string().min(1),
  counts: z.object({
    todayLessons: z.number().int().nonnegative(),
    awaitingNotes: z.number().int().nonnegative(),
    flags: z.number().int().nonnegative(),
  }),
  todayLessons: z.array(lessonSchema),
  awaitingNotes: z.array(awaitingNoteSchema),
  flags: z.array(flagSchema),
});

export function buildTeacherHomeSnapshot(input: TeacherHomeSourceData): TeacherHomeSnapshot {
  const now = input.now ?? new Date();
  const todayLessons = input.todayLessons.map((lesson) => ({
    id: lesson.id,
    startsAt: lesson.startsAt.toISOString(),
    title: lesson.title,
    groupName: lesson.groupName,
    studentCount: lesson.studentCount,
    hasPendingNote: lesson.hasPendingNote,
  }));

  const awaitingNotes = input.awaitingNotes.map((lesson) => ({
    id: lesson.id,
    startsAt: lesson.startsAt.toISOString(),
    groupName: lesson.groupName,
  }));

  const summary = [
    todayLessons.length ? `${todayLessons.length} ders` : null,
    awaitingNotes.length ? `${awaitingNotes.length} ders için not girişi bekliyor` : null,
  ]
    .filter((item): item is string => Boolean(item))
    .join(" · ");

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    summary: summary || "Bugün planlanmış ders yok.",
    counts: {
      todayLessons: todayLessons.length,
      awaitingNotes: awaitingNotes.length,
      flags: 0,
    },
    todayLessons,
    awaitingNotes,
    flags: [],
  };
}
