/**
 * Absence Excuse helpers — Phase 2 / Session 6.
 *
 * Permission boundary:
 *
 * Parent
 *   - SUBMIT/CANCEL only for own linked children (ParentStudent).
 *   - VIEW only own submitted excuses.
 *   - CANCEL only PENDING.
 *
 * Teacher
 *   - VIEW/REVIEW only excuses for students who are EITHER
 *     in a classroom this teacher is assigned to (ClassroomTeacher) OR
 *     have at least one Lesson with `teacherId === this teacher`.
 *   - APPROVE/REJECT only PENDING.
 *
 * Admin
 *   - Full access (gated at the route level via `requirePanelRole("admin")`).
 *
 * Attendance integration on APPROVE:
 *   - For each Lesson belonging to the student in [startsAt, endsAt]:
 *       - if NO Attendance row exists → create EXCUSED (source=MANUAL).
 *       - if existing row.status === ABSENT → update to EXCUSED.
 *       - otherwise (PRESENT / LATE / LEFT_EARLY / already EXCUSED) → leave it.
 *     This protects manually-recorded readings; the reviewer's `reviewNote`
 *     can document any conflicts.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  AbsenceExcuseReason,
  AbsenceExcuseStatus,
  Prisma,
} from "@prisma/client";

// Phase 2 / Session 13 — Pure display helpers + row type live in
// `absence-excuses-display.ts` (no `server-only` marker) so client
// components can import them without pulling Prisma into the bundle.
export {
  type AbsenceExcuseRow,
  getAbsenceExcuseReasonLabel,
  getAbsenceExcuseStatusLabel,
  getAbsenceExcuseStatusTone,
  ABSENCE_REASON_OPTIONS,
} from "./absence-excuses-display";

import type { AbsenceExcuseRow } from "./absence-excuses-display";

// Internal-only label map used by `approveAbsenceExcuse` note text.
const REASON_LABEL: Record<AbsenceExcuseReason, string> = {
  ILLNESS: "Hastalık",
  FAMILY: "Ailevi neden",
  TECHNICAL: "Teknik sorun",
  TRAVEL: "Seyahat",
  OTHER: "Diğer",
};

// ─────────────────────────────────────────────────────────────────────────────
// Row shape exposed to UI (no leaking Prisma types)
// ─────────────────────────────────────────────────────────────────────────────

const EXCUSE_INCLUDE = {
  parent: { select: { id: true, fullName: true } },
  student: {
    select: {
      id: true,
      fullName: true,
      classrooms: {
        where: { leftAt: null },
        select: { classroom: { select: { name: true } } },
      },
    },
  },
  lesson: { select: { id: true, title: true, subject: true, scheduledAt: true } },
  reviewedBy: { select: { id: true, name: true, email: true } },
} satisfies Prisma.AbsenceExcuseInclude;

type ExcuseWithIncludes = Prisma.AbsenceExcuseGetPayload<{
  include: typeof EXCUSE_INCLUDE;
}>;

async function attachAffectedCounts(
  rows: ExcuseWithIncludes[],
): Promise<AbsenceExcuseRow[]> {
  if (rows.length === 0) return [];
  // Batch the affected-lesson count for each row in parallel.
  const counts = await Promise.all(
    rows.map((r) =>
      prisma.lesson.count({
        where: {
          studentId: r.studentId,
          scheduledAt: { gte: r.startsAt, lte: r.endsAt },
        },
      }),
    ),
  );
  return rows.map((r, i) => ({
    id: r.id,
    parentId: r.parentId,
    parentName: r.parent?.fullName ?? null,
    studentId: r.studentId,
    studentName: r.student?.fullName ?? null,
    classroomNames:
      r.student?.classrooms.map((c) => c.classroom.name).filter(Boolean) ?? [],
    lessonId: r.lessonId,
    lessonTitle: r.lesson?.title ?? r.lesson?.subject ?? null,
    lessonScheduledAt: r.lesson?.scheduledAt ?? null,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    reason: r.reason,
    note: r.note,
    attachmentUrl: r.attachmentUrl,
    status: r.status,
    reviewedById: r.reviewedById,
    reviewedByName: r.reviewedBy?.name ?? r.reviewedBy?.email ?? null,
    reviewedAt: r.reviewedAt,
    reviewNote: r.reviewNote,
    affectedLessonCount: counts[i] ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission predicates
// ─────────────────────────────────────────────────────────────────────────────

export async function canParentSubmitExcuse(
  parentId: string,
  studentId: string,
): Promise<boolean> {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { parentId: true },
  });
  return !!link;
}

/**
 * Bir öğretmen verilen excuse'u inceleyebilir mi?
 * Kural: öğrenci, öğretmenin bağlı olduğu sınıflardan birinde aktif üye OR
 *        öğrenci ile öğretmen arasında en az bir Lesson kaydı var.
 */
export async function canTeacherReviewExcuse(
  teacherId: string,
  excuseId: string,
): Promise<boolean> {
  const ex = await prisma.absenceExcuse.findUnique({
    where: { id: excuseId },
    select: { studentId: true },
  });
  if (!ex) return false;
  return canTeacherSeeStudent(teacherId, ex.studentId);
}

export async function canTeacherSeeStudent(
  teacherId: string,
  studentId: string,
): Promise<boolean> {
  const [classroomLink, lesson] = await Promise.all([
    prisma.classroomTeacher.findFirst({
      where: {
        teacherId,
        classroom: {
          students: { some: { studentId, leftAt: null } },
        },
      },
      select: { teacherId: true },
    }),
    prisma.lesson.findFirst({
      where: { teacherId, studentId },
      select: { id: true },
    }),
  ]);
  return !!classroomLink || !!lesson;
}

async function getTeacherStudentIds(teacherId: string): Promise<string[]> {
  const [classroomLinks, lessons] = await Promise.all([
    prisma.classroomTeacher.findMany({
      where: { teacherId },
      select: {
        classroom: {
          select: {
            students: {
              where: { leftAt: null },
              select: { studentId: true },
            },
          },
        },
      },
    }),
    prisma.lesson.findMany({
      where: { teacherId },
      select: { studentId: true },
      distinct: ["studentId"],
      take: 500,
    }),
  ]);
  const set = new Set<string>();
  for (const link of classroomLinks)
    for (const s of link.classroom.students) set.add(s.studentId);
  for (const l of lessons) set.add(l.studentId);
  return Array.from(set);
}

// ─────────────────────────────────────────────────────────────────────────────
// Read queries
// ─────────────────────────────────────────────────────────────────────────────

export async function getParentExcuses(
  parentId: string,
  selectedStudentId?: string | null,
  limit = 20,
): Promise<AbsenceExcuseRow[]> {
  const rows = await prisma.absenceExcuse.findMany({
    where: {
      parentId,
      ...(selectedStudentId ? { studentId: selectedStudentId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: EXCUSE_INCLUDE,
    take: Math.max(1, Math.min(100, limit)),
  });
  return attachAffectedCounts(rows);
}

export async function countParentPendingExcuses(
  parentId: string,
  studentId?: string | null,
): Promise<number> {
  return prisma.absenceExcuse.count({
    where: {
      parentId,
      status: "PENDING",
      ...(studentId ? { studentId } : {}),
    },
  });
}

export async function getPendingExcusesForTeacher(
  teacherId: string,
  limit = 25,
): Promise<AbsenceExcuseRow[]> {
  const studentIds = await getTeacherStudentIds(teacherId);
  if (studentIds.length === 0) return [];
  const rows = await prisma.absenceExcuse.findMany({
    where: {
      studentId: { in: studentIds },
      status: "PENDING",
    },
    orderBy: { createdAt: "asc" },
    include: EXCUSE_INCLUDE,
    take: Math.max(1, Math.min(100, limit)),
  });
  return attachAffectedCounts(rows);
}

export async function getPendingExcusesForClassroom(
  teacherId: string,
  classroomId: string,
  limit = 10,
): Promise<AbsenceExcuseRow[]> {
  // Make sure this teacher is assigned to that classroom.
  const link = await prisma.classroomTeacher.findUnique({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    select: { teacherId: true },
  });
  if (!link) return [];
  const rows = await prisma.absenceExcuse.findMany({
    where: {
      status: { in: ["PENDING", "APPROVED"] },
      student: {
        classrooms: { some: { classroomId, leftAt: null } },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: EXCUSE_INCLUDE,
    take: Math.max(1, Math.min(50, limit)),
  });
  return attachAffectedCounts(rows);
}

export type AdminExcuseFilters = {
  status?: AbsenceExcuseStatus | null;
  studentId?: string | null;
  from?: Date | null;
  to?: Date | null;
  take?: number;
};

export async function getExcusesForAdmin(
  filters?: AdminExcuseFilters,
): Promise<AbsenceExcuseRow[]> {
  const where: Prisma.AbsenceExcuseWhereInput = {
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.studentId ? { studentId: filters.studentId } : {}),
    ...(filters?.from || filters?.to
      ? {
          startsAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };
  const rows = await prisma.absenceExcuse.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: EXCUSE_INCLUDE,
    take: Math.max(1, Math.min(200, filters?.take ?? 100)),
  });
  return attachAffectedCounts(rows);
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson-coupling helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function getExcuseAffectedLessons(
  studentId: string,
  startsAt: Date,
  endsAt: Date,
): Promise<
  Array<{
    id: string;
    title: string | null;
    subject: string | null;
    scheduledAt: Date;
    duration: number;
    classroomId: string | null;
  }>
> {
  if (endsAt.getTime() < startsAt.getTime()) return [];
  return prisma.lesson.findMany({
    where: {
      studentId,
      scheduledAt: { gte: startsAt, lte: endsAt },
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      title: true,
      subject: true,
      scheduledAt: true,
      duration: true,
      classroomId: true,
    },
    take: 50,
  });
}

/**
 * Aktif/onaylı excuse VAR MI? — bir lesson için. Attendance UI bu sonucu
 * "Onaylı mazeret var" rozeti olarak göstermek için kullanır.
 */
export async function getApprovedExcuseForLesson(
  studentId: string,
  lessonId: string,
): Promise<{ id: string; reason: AbsenceExcuseReason; note: string | null } | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { scheduledAt: true, studentId: true },
  });
  if (!lesson || lesson.studentId !== studentId) return null;
  const ex = await prisma.absenceExcuse.findFirst({
    where: {
      studentId,
      status: "APPROVED",
      OR: [
        { lessonId },
        {
          lessonId: null,
          startsAt: { lte: lesson.scheduledAt },
          endsAt: { gte: lesson.scheduledAt },
        },
      ],
    },
    select: { id: true, reason: true, note: true },
  });
  return ex;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attendance write — used when an excuse is APPROVED
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the number of Attendance rows created or updated to EXCUSED.
 *
 * Safety rules:
 *   - Never overwrites PRESENT / LATE / LEFT_EARLY / already-EXCUSED.
 *   - Creates a new row only when the lesson has no Attendance for this
 *     student. Uses `source=MANUAL` (this is an explicit human review),
 *     `recordedById = reviewerUserId`, and `notes` referencing the excuse.
 */
export async function applyApprovedExcuseToAttendance(opts: {
  excuseId: string;
  studentId: string;
  startsAt: Date;
  endsAt: Date;
  reviewerUserId: string | null;
  reason: AbsenceExcuseReason;
}): Promise<{ created: number; updated: number; skipped: number }> {
  const lessons = await prisma.lesson.findMany({
    where: {
      studentId: opts.studentId,
      scheduledAt: { gte: opts.startsAt, lte: opts.endsAt },
    },
    select: {
      id: true,
      scheduledAt: true,
      classroomId: true,
    },
  });
  if (lessons.length === 0) return { created: 0, updated: 0, skipped: 0 };

  const noteText = `Mazeret onayı (${REASON_LABEL[opts.reason]}) — Excuse #${opts.excuseId.slice(0, 8)}`;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const lesson of lessons) {
    const existing = await prisma.attendance.findFirst({
      where: {
        studentId: opts.studentId,
        lessonId: lesson.id,
        context: "LESSON",
      },
      select: { id: true, status: true },
    });

    if (!existing) {
      try {
        await prisma.attendance.create({
          data: {
            studentId: opts.studentId,
            context: "LESSON",
            lessonId: lesson.id,
            classroomId: lesson.classroomId ?? null,
            sessionDate: lesson.scheduledAt,
            status: "EXCUSED",
            source: "MANUAL",
            recordedById: opts.reviewerUserId,
            notes: noteText,
          },
        });
        created += 1;
      } catch (err) {
        // partial-unique race — re-read and treat as skipped
        console.warn("[absence-excuse] attendance create race", err);
        skipped += 1;
      }
    } else if (existing.status === "ABSENT") {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: "EXCUSED",
          notes: noteText,
          recordedById: opts.reviewerUserId,
        },
      });
      updated += 1;
    } else {
      skipped += 1;
    }
  }
  return { created, updated, skipped };
}
