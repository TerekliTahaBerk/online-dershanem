/**
 * Material library helpers — Phase 2 / Session 5.
 *
 * Permission boundary (enforced HERE; the DB has no row-level security):
 *
 * Teacher:
 *   - Can write only to classrooms they teach (ClassroomTeacher row).
 *   - Can read any material whose `createdById === teacher.userId` OR
 *     whose `classroomId` is one they teach OR whose visibility is
 *     TEACHERS (org-wide teacher pool — kept simple).
 *
 * Student:
 *   - Can read only `isPublished` + non-`isArchived` materials whose
 *     visibility is CLASSROOM/STUDENTS AND whose `classroomId` matches
 *     an active ClassroomStudent (`leftAt: null`) OR whose `courseId`
 *     matches a course the student has a Lesson for.
 *   - Cannot see TEACHERS or PRIVATE.
 *
 * Parent: deferred — no parent-facing materials view in this session.
 *
 * Notes on shape:
 *   - Returned `MaterialRow` is a normalized, UI-friendly view (does not
 *     leak Prisma internal types). Cursor pagination is intentionally
 *     simple "take + orderBy createdAt desc"; can grow later.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type { MaterialType, MaterialVisibility, Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type MaterialRow = {
  id: string;
  title: string;
  description: string | null;
  type: MaterialType;
  url: string | null;
  fileUrl: string | null;
  subject: string | null;
  courseId: string | null;
  courseTitle: string | null;
  classroomId: string | null;
  classroomName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  visibility: MaterialVisibility;
  isPublished: boolean;
  isArchived: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MaterialListFilters = {
  type?: MaterialType | null;
  courseId?: string | null;
  classroomId?: string | null;
  /** Son N gün — opsiyonel hızlı filtre */
  recentDays?: number | null;
  /** En çok kaç kayıt döner (default 30) */
  take?: number;
};

const DEFAULT_TAKE = 30;
const MAX_TAKE = 100;

const MATERIAL_INCLUDE = {
  course: { select: { id: true, title: true, subject: true } },
  classroom: { select: { id: true, name: true } },
  teacher: { select: { id: true, fullName: true } },
} satisfies Prisma.MaterialInclude;

type MaterialWithIncludes = Prisma.MaterialGetPayload<{ include: typeof MATERIAL_INCLUDE }>;

function toRow(m: MaterialWithIncludes): MaterialRow {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    type: m.type,
    url: m.url,
    fileUrl: m.fileUrl,
    subject: m.subject ?? m.course?.subject ?? null,
    courseId: m.courseId,
    courseTitle: m.course?.title ?? null,
    classroomId: m.classroomId,
    classroomName: m.classroom?.name ?? null,
    teacherId: m.teacherId,
    teacherName: m.teacher?.fullName ?? null,
    visibility: m.visibility,
    isPublished: m.isPublished,
    isArchived: m.isArchived,
    publishedAt: m.publishedAt,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  };
}

function takeOf(filters?: MaterialListFilters): number {
  const t = filters?.take ?? DEFAULT_TAKE;
  return Math.max(1, Math.min(MAX_TAKE, t));
}

function recentSince(filters?: MaterialListFilters): Date | null {
  const days = filters?.recentDays ?? null;
  if (!days || days <= 0) return null;
  return new Date(Date.now() - days * 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — student-side scope resolution
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentClassroomIds(studentId: string): Promise<string[]> {
  const rows = await prisma.classroomStudent.findMany({
    where: { studentId, leftAt: null },
    select: { classroomId: true },
  });
  return rows.map((r) => r.classroomId);
}

export async function getStudentCourseIds(studentId: string): Promise<string[]> {
  // Courses the student has at least one Lesson for (direct or via classroom).
  const rows = await prisma.lesson.findMany({
    where: {
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
      courseId: { not: null },
    },
    select: { courseId: true },
    distinct: ["courseId"],
    take: 100,
  });
  return rows.map((r) => r.courseId).filter((id): id is string => !!id);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) getMaterialsForStudent
// ─────────────────────────────────────────────────────────────────────────────

export async function getMaterialsForStudent(
  studentId: string,
  filters?: MaterialListFilters,
): Promise<MaterialRow[]> {
  const [classroomIds, courseIds] = await Promise.all([
    getStudentClassroomIds(studentId),
    getStudentCourseIds(studentId),
  ]);
  if (classroomIds.length === 0 && courseIds.length === 0) return [];

  const since = recentSince(filters);

  const where: Prisma.MaterialWhereInput = {
    isPublished: true,
    isArchived: false,
    visibility: { in: ["CLASSROOM", "STUDENTS"] },
    OR: [
      ...(classroomIds.length > 0 ? [{ classroomId: { in: classroomIds } }] : []),
      ...(courseIds.length > 0 ? [{ courseId: { in: courseIds } }] : []),
    ],
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.courseId ? { courseId: filters.courseId } : {}),
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const rows = await prisma.material.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: MATERIAL_INCLUDE,
    take: takeOf(filters),
  });
  return rows.map(toRow);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) getMaterialsForTeacher — own creations + assigned-classroom materials
// ─────────────────────────────────────────────────────────────────────────────

export async function getMaterialsForTeacher(
  teacherId: string,
  filters?: MaterialListFilters,
): Promise<MaterialRow[]> {
  const teacherRow = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true },
  });

  // Classrooms the teacher is assigned to.
  const classroomLinks = await prisma.classroomTeacher.findMany({
    where: { teacherId },
    select: { classroomId: true },
  });
  const classroomIds = classroomLinks.map((c) => c.classroomId);

  const orClauses: Prisma.MaterialWhereInput[] = [
    { teacherId },
  ];
  if (teacherRow?.userId) orClauses.push({ createdById: teacherRow.userId });
  if (classroomIds.length > 0) orClauses.push({ classroomId: { in: classroomIds } });

  const since = recentSince(filters);
  const where: Prisma.MaterialWhereInput = {
    isArchived: false,
    OR: orClauses,
    ...(filters?.type ? { type: filters.type } : {}),
    ...(filters?.courseId ? { courseId: filters.courseId } : {}),
    ...(filters?.classroomId ? { classroomId: filters.classroomId } : {}),
    ...(since ? { createdAt: { gte: since } } : {}),
  };

  const rows = await prisma.material.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: MATERIAL_INCLUDE,
    take: takeOf(filters),
  });
  return rows.map(toRow);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) getMaterialsForClassroom — recent published, gated by teacher link
// ─────────────────────────────────────────────────────────────────────────────

export async function getMaterialsForClassroom(
  teacherId: string,
  classroomId: string,
  take = 6,
): Promise<MaterialRow[]> {
  const link = await prisma.classroomTeacher.findUnique({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    select: { teacherId: true },
  });
  if (!link) return [];

  const rows = await prisma.material.findMany({
    where: {
      classroomId,
      isArchived: false,
    },
    orderBy: [{ isPublished: "desc" }, { createdAt: "desc" }],
    include: MATERIAL_INCLUDE,
    take: Math.max(1, Math.min(20, take)),
  });
  return rows.map(toRow);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Permission predicates
// ─────────────────────────────────────────────────────────────────────────────

/**
 * `canTeacherAccessMaterial` — true if the teacher created it OR is
 * assigned to its classroom OR visibility is TEACHERS (org-wide pool).
 */
export async function canTeacherAccessMaterial(
  teacherId: string,
  materialId: string,
  options?: { write?: boolean },
): Promise<boolean> {
  const m = await prisma.material.findUnique({
    where: { id: materialId },
    select: {
      teacherId: true,
      createdById: true,
      classroomId: true,
      visibility: true,
    },
  });
  if (!m) return false;

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true },
  });
  const ownByTeacherId = m.teacherId === teacherId;
  const ownByCreator = !!teacher?.userId && m.createdById === teacher.userId;

  if (ownByTeacherId || ownByCreator) return true;

  // Read-only fallbacks:
  if (options?.write) return false;

  if (m.classroomId) {
    const link = await prisma.classroomTeacher.findUnique({
      where: { classroomId_teacherId: { classroomId: m.classroomId, teacherId } },
      select: { teacherId: true },
    });
    if (link) return true;
  }
  if (m.visibility === "TEACHERS") return true;

  return false;
}

/**
 * `canStudentAccessMaterial` — published + non-archived + visibility is
 * student-readable + classroom membership OR matching course lesson.
 */
export async function canStudentAccessMaterial(
  studentId: string,
  materialId: string,
): Promise<boolean> {
  const m = await prisma.material.findUnique({
    where: { id: materialId },
    select: {
      isPublished: true,
      isArchived: true,
      visibility: true,
      classroomId: true,
      courseId: true,
    },
  });
  if (!m) return false;
  if (!m.isPublished || m.isArchived) return false;
  if (m.visibility !== "CLASSROOM" && m.visibility !== "STUDENTS") return false;

  if (m.classroomId) {
    const link = await prisma.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId: m.classroomId, studentId } },
      select: { leftAt: true },
    });
    if (link && link.leftAt === null) return true;
  }
  if (m.courseId) {
    const lesson = await prisma.lesson.findFirst({
      where: {
        courseId: m.courseId,
        OR: [
          { studentId },
          { classroom: { students: { some: { studentId, leftAt: null } } } },
        ],
      },
      select: { id: true },
    });
    if (lesson) return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Display helpers
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<MaterialType, string> = {
  PDF: "PDF",
  VIDEO: "Video",
  LINK: "Bağlantı",
  FILE: "Dosya",
  NOTE: "Not",
};

const TYPE_TONE: Record<MaterialType, "ok" | "warn" | "bad" | "neutral" | "accent" | "teal" | "purple"> = {
  PDF: "bad",
  VIDEO: "purple",
  LINK: "accent",
  FILE: "teal",
  NOTE: "neutral",
};

const TYPE_GLYPH: Record<MaterialType, string> = {
  PDF: "📄",
  VIDEO: "▶",
  LINK: "🔗",
  FILE: "📎",
  NOTE: "📝",
};

const VIS_LABEL: Record<MaterialVisibility, string> = {
  CLASSROOM: "Sınıf",
  STUDENTS: "Öğrencilere açık",
  TEACHERS: "Öğretmenlere açık",
  PRIVATE: "Özel",
};

export function getMaterialTypeLabel(t: MaterialType): string {
  return TYPE_LABEL[t] ?? String(t);
}
export function getMaterialTypeTone(t: MaterialType) {
  return TYPE_TONE[t] ?? "neutral";
}
export function getMaterialTypeGlyph(t: MaterialType): string {
  return TYPE_GLYPH[t] ?? "📁";
}
export function getMaterialVisibilityLabel(v: MaterialVisibility): string {
  return VIS_LABEL[v] ?? String(v);
}

/**
 * Açılacak link — type'a göre (öncelik: url, fallback: fileUrl).
 * NOTE türü için `null` döner (UI içerikte gösterir).
 */
export function getMaterialOpenUrl(m: Pick<MaterialRow, "type" | "url" | "fileUrl">): string | null {
  if (m.type === "NOTE") return null;
  return m.url || m.fileUrl || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) Course-scoped student materials (Study Room "Bu derse ait materyaller")
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentMaterialsByCourse(
  studentId: string,
  courseId: string,
  take = 5,
): Promise<MaterialRow[]> {
  const ok = await prisma.lesson.findFirst({
    where: {
      courseId,
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
    },
    select: { id: true },
  });
  if (!ok) return [];

  const rows = await prisma.material.findMany({
    where: {
      courseId,
      isPublished: true,
      isArchived: false,
      visibility: { in: ["CLASSROOM", "STUDENTS"] },
    },
    orderBy: { createdAt: "desc" },
    include: MATERIAL_INCLUDE,
    take: Math.max(1, Math.min(20, take)),
  });
  return rows.map(toRow);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) Recommendations for student dashboard
// ─────────────────────────────────────────────────────────────────────────────

export type StudentMaterialRecommendations = {
  recent: MaterialRow[];
  byNextLessonCourse: MaterialRow[];
  /**
   * Phase 2 / Session 9 — Materials explicitly attached by the teacher to
   * the student's nearest-due homework + next lesson. Highest signal:
   * "this is what your teacher said you should look at next."
   */
  attachedToFocus: MaterialRow[];
  totalAccessible: number;
};

export async function getStudentMaterialRecommendations(
  studentId: string,
): Promise<StudentMaterialRecommendations> {
  const [classroomIds, courseIds] = await Promise.all([
    getStudentClassroomIds(studentId),
    getStudentCourseIds(studentId),
  ]);
  if (classroomIds.length === 0 && courseIds.length === 0) {
    return { recent: [], byNextLessonCourse: [], attachedToFocus: [], totalAccessible: 0 };
  }

  const baseWhere: Prisma.MaterialWhereInput = {
    isPublished: true,
    isArchived: false,
    visibility: { in: ["CLASSROOM", "STUDENTS"] },
    OR: [
      ...(classroomIds.length > 0 ? [{ classroomId: { in: classroomIds } }] : []),
      ...(courseIds.length > 0 ? [{ courseId: { in: courseIds } }] : []),
    ],
  };

  // Determine next-lesson course (within 7 days look-ahead).
  const nextLesson = await prisma.lesson.findFirst({
    where: {
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
      scheduledAt: { gte: new Date(Date.now() - 30 * 60_000) },
      courseId: { not: null },
    },
    orderBy: { scheduledAt: "asc" },
    select: { id: true, courseId: true },
  });

  // Phase 2 / Session 9 — Find nearest-due homework for the student.
  const focusHomework = await prisma.assignment.findFirst({
    where: {
      status: "PUBLISHED",
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
      dueAt: { gte: new Date() },
    },
    orderBy: { dueAt: "asc" },
    select: { id: true },
  });

  const [recent, totalAccessible, byCourseRaw, focusAttachedRaw] = await Promise.all([
    prisma.material.findMany({
      where: baseWhere,
      orderBy: { createdAt: "desc" },
      include: MATERIAL_INCLUDE,
      take: 4,
    }),
    prisma.material.count({ where: baseWhere }),
    nextLesson?.courseId
      ? prisma.material.findMany({
          where: {
            ...baseWhere,
            courseId: nextLesson.courseId,
          },
          orderBy: { createdAt: "desc" },
          include: MATERIAL_INCLUDE,
          take: 4,
        })
      : Promise.resolve([] as MaterialWithIncludes[]),
    // Materials attached to nearest-due homework OR next lesson.
    prisma.material.findMany({
      where: {
        ...baseWhere,
        OR: [
          ...(focusHomework
            ? [{ assignments: { some: { assignmentId: focusHomework.id } } }]
            : []),
          ...(nextLesson
            ? [{ lessons: { some: { lessonId: nextLesson.id } } }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      include: MATERIAL_INCLUDE,
      take: 6,
    }),
  ]);

  return {
    recent: recent.map(toRow),
    byNextLessonCourse: byCourseRaw.map(toRow),
    attachedToFocus: focusAttachedRaw.map(toRow),
    totalAccessible,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) Teacher-side classroom + course options for the create form
// ─────────────────────────────────────────────────────────────────────────────

export type TeacherClassroomOption = {
  id: string;
  name: string;
  branch: string | null;
};
export type TeacherCourseOption = {
  id: string;
  title: string;
  subject: string;
};

export async function getTeacherClassroomOptions(
  teacherId: string,
): Promise<TeacherClassroomOption[]> {
  const rows = await prisma.classroomTeacher.findMany({
    where: { teacherId, classroom: { isActive: true } },
    select: {
      classroom: { select: { id: true, name: true, branch: true } },
    },
  });
  return rows
    .map((r) => ({
      id: r.classroom.id,
      name: r.classroom.name,
      branch: r.classroom.branch,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

export async function getTeacherCourseOptions(
  teacherId: string,
): Promise<TeacherCourseOption[]> {
  // Courses the teacher is the default for OR has any Lesson for.
  const [defaults, lessons] = await Promise.all([
    prisma.course.findMany({
      where: { defaultTeacherId: teacherId, isActive: true },
      select: { id: true, title: true, subject: true },
    }),
    prisma.lesson.findMany({
      where: { teacherId, courseId: { not: null } },
      select: { course: { select: { id: true, title: true, subject: true, isActive: true } } },
      take: 200,
    }),
  ]);
  const map = new Map<string, TeacherCourseOption>();
  for (const c of defaults) map.set(c.id, { id: c.id, title: c.title, subject: c.subject });
  for (const l of lessons) {
    const c = l.course;
    if (!c || !c.isActive || map.has(c.id)) continue;
    map.set(c.id, { id: c.id, title: c.title, subject: c.subject });
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "tr"));
}
