/**
 * Material attachments — Phase 2 / Session 9.
 *
 * Connects existing `Material` records to `Assignment` and `Lesson` rows
 * through additive join tables. **No new content type.** Just a typed
 * permission-aware bridge between Materials and the rest of the panel.
 *
 * Permission rules (enforced HERE; the DB has no row-level security):
 *
 * Teacher (attach / detach):
 *   - Must own the assignment / lesson (teacherId === their teacher id).
 *   - Must have **write** access to the Material — i.e. they created it
 *     OR `material.teacherId === theirId`. (Reuses
 *     `canTeacherAccessMaterial(..., { write: true })`.)
 *
 * Teacher (read attached list):
 *   - Always allowed for assignments / lessons they own. Materials are
 *     surfaced regardless of read scope so the teacher can see what
 *     they once attached even if the material was later restricted.
 *
 * Student (read attached list):
 *   - Must be addressable by the assignment / lesson (own studentId or
 *     active classroom membership) AND must have student-read access to
 *     the Material (`canStudentAccessMaterial`). If the material became
 *     PRIVATE / archived / unpublished the row is silently filtered.
 *
 * Admin and parent flows are deferred for this session.
 */

import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canTeacherAccessMaterial,
  canStudentAccessMaterial,
  getMaterialsForTeacher,
  type MaterialRow,
  type MaterialListFilters,
} from "@/lib/panel/materials";

// Re-export so consumers don't reach into both modules.
export type { MaterialRow };

// ─────────────────────────────────────────────────────────────────────────────
// Internal: shared shape for joined rows
// ─────────────────────────────────────────────────────────────────────────────

const MATERIAL_INCLUDE = {
  course: { select: { id: true, title: true, subject: true } },
  classroom: { select: { id: true, name: true } },
  teacher: { select: { id: true, fullName: true } },
} satisfies Prisma.MaterialInclude;

type JoinedMaterial = Prisma.MaterialGetPayload<{ include: typeof MATERIAL_INCLUDE }>;

function toRow(m: JoinedMaterial): MaterialRow {
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

// ─────────────────────────────────────────────────────────────────────────────
// Read — attached materials for an assignment / lesson
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Materials currently attached to the assignment, oldest-attached first
 * (stable order so the UI doesn't shuffle on rerender).
 */
export async function getMaterialsForAssignment(assignmentId: string): Promise<MaterialRow[]> {
  const rows = await prisma.assignmentMaterial.findMany({
    where: { assignmentId },
    orderBy: { createdAt: "asc" },
    include: { material: { include: MATERIAL_INCLUDE } },
  });
  return rows.map((r) => toRow(r.material as JoinedMaterial));
}

export async function getMaterialsForLesson(lessonId: string): Promise<MaterialRow[]> {
  const rows = await prisma.lessonMaterial.findMany({
    where: { lessonId },
    orderBy: { createdAt: "asc" },
    include: { material: { include: MATERIAL_INCLUDE } },
  });
  return rows.map((r) => toRow(r.material as JoinedMaterial));
}

// ─────────────────────────────────────────────────────────────────────────────
// Picker — what can THIS teacher attach right now?
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Picker source for the teacher attachment UI.
 * Returns the same set of Materials the teacher already sees in their
 * library, optionally narrowed by classroom / course / subject.
 *
 * `excludeMaterialIds` lets pages drop already-attached rows so the
 * picker only shows additions.
 */
export async function getAttachableMaterialsForTeacher(
  teacherId: string,
  options?: MaterialListFilters & { excludeMaterialIds?: string[] },
): Promise<MaterialRow[]> {
  const list = await getMaterialsForTeacher(teacherId, {
    type: options?.type ?? null,
    courseId: options?.courseId ?? null,
    classroomId: options?.classroomId ?? null,
    recentDays: options?.recentDays ?? null,
    take: options?.take ?? 60,
  });
  const excluded = new Set(options?.excludeMaterialIds ?? []);
  return excluded.size === 0 ? list : list.filter((m) => !excluded.has(m.id));
}

// ─────────────────────────────────────────────────────────────────────────────
// Permission guards
// ─────────────────────────────────────────────────────────────────────────────

export async function canTeacherAttachMaterialToAssignment(
  teacherId: string,
  assignmentId: string,
  materialId: string,
): Promise<boolean> {
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { teacherId: true },
  });
  if (!a || a.teacherId !== teacherId) return false;
  return canTeacherAccessMaterial(teacherId, materialId, { write: true });
}

export async function canTeacherAttachMaterialToLesson(
  teacherId: string,
  lessonId: string,
  materialId: string,
): Promise<boolean> {
  const l = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacherId: true },
  });
  if (!l || l.teacherId !== teacherId) return false;
  return canTeacherAccessMaterial(teacherId, materialId, { write: true });
}

/**
 * Student must be addressable by the assignment AND have student-read
 * access to the material.
 */
export async function canStudentViewAssignmentMaterial(
  studentId: string,
  assignmentId: string,
  materialId: string,
): Promise<boolean> {
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { studentId: true, classroomId: true, status: true },
  });
  if (!a) return false;
  if (a.status !== "PUBLISHED") return false;

  let addressable = false;
  if (a.studentId === studentId) {
    addressable = true;
  } else if (a.classroomId) {
    const link = await prisma.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId: a.classroomId, studentId } },
      select: { leftAt: true },
    });
    addressable = !!(link && link.leftAt === null);
  } else {
    // "All teacher's students" assignments — fall back to a lesson check.
    const teacherLesson = await prisma.lesson.findFirst({
      where: {
        OR: [
          { studentId },
          { classroom: { students: { some: { studentId, leftAt: null } } } },
        ],
        teacher: { assignments: { some: { id: assignmentId } } },
      },
      select: { id: true },
    });
    addressable = !!teacherLesson;
  }
  if (!addressable) return false;

  return canStudentAccessMaterial(studentId, materialId);
}

/**
 * Student must be the lesson's student OR a member of the lesson's
 * classroom AND have student-read access to the material.
 */
export async function canStudentViewLessonMaterial(
  studentId: string,
  lessonId: string,
  materialId: string,
): Promise<boolean> {
  const l = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { studentId: true, classroomId: true },
  });
  if (!l) return false;

  let addressable = l.studentId === studentId;
  if (!addressable && l.classroomId) {
    const link = await prisma.classroomStudent.findUnique({
      where: { classroomId_studentId: { classroomId: l.classroomId, studentId } },
      select: { leftAt: true },
    });
    addressable = !!(link && link.leftAt === null);
  }
  if (!addressable) return false;

  return canStudentAccessMaterial(studentId, materialId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations — attach / detach
// All mutations are idempotent (createMany skipDuplicates / deleteMany).
// They never throw on permission denial; the caller should check first.
// ─────────────────────────────────────────────────────────────────────────────

export async function attachMaterialToAssignment(
  teacherId: string,
  assignmentId: string,
  materialId: string,
): Promise<{ ok: boolean; reason?: "denied" | "missing" }> {
  const allowed = await canTeacherAttachMaterialToAssignment(teacherId, assignmentId, materialId);
  if (!allowed) return { ok: false, reason: "denied" };
  await prisma.assignmentMaterial.upsert({
    where: { assignmentId_materialId: { assignmentId, materialId } },
    create: { assignmentId, materialId },
    update: {},
  });
  return { ok: true };
}

export async function detachMaterialFromAssignment(
  teacherId: string,
  assignmentId: string,
  materialId: string,
): Promise<{ ok: boolean; reason?: "denied" }> {
  const a = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    select: { teacherId: true },
  });
  if (!a || a.teacherId !== teacherId) return { ok: false, reason: "denied" };
  await prisma.assignmentMaterial.deleteMany({ where: { assignmentId, materialId } });
  return { ok: true };
}

export async function attachMaterialToLesson(
  teacherId: string,
  lessonId: string,
  materialId: string,
): Promise<{ ok: boolean; reason?: "denied" | "missing" }> {
  const allowed = await canTeacherAttachMaterialToLesson(teacherId, lessonId, materialId);
  if (!allowed) return { ok: false, reason: "denied" };
  await prisma.lessonMaterial.upsert({
    where: { lessonId_materialId: { lessonId, materialId } },
    create: { lessonId, materialId },
    update: {},
  });
  return { ok: true };
}

export async function detachMaterialFromLesson(
  teacherId: string,
  lessonId: string,
  materialId: string,
): Promise<{ ok: boolean; reason?: "denied" }> {
  const l = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { teacherId: true },
  });
  if (!l || l.teacherId !== teacherId) return { ok: false, reason: "denied" };
  await prisma.lessonMaterial.deleteMany({ where: { lessonId, materialId } });
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Bulk helpers (used by dashboard / focus widgets)
// ─────────────────────────────────────────────────────────────────────────────

export async function getAttachedMaterialCountByAssignment(
  assignmentIds: string[],
): Promise<Map<string, number>> {
  if (assignmentIds.length === 0) return new Map();
  const groups = await prisma.assignmentMaterial.groupBy({
    by: ["assignmentId"],
    where: { assignmentId: { in: assignmentIds } },
    _count: { _all: true },
  });
  return new Map(groups.map((g) => [g.assignmentId, g._count._all]));
}

export async function getAttachedMaterialCountByLesson(
  lessonIds: string[],
): Promise<Map<string, number>> {
  if (lessonIds.length === 0) return new Map();
  const groups = await prisma.lessonMaterial.groupBy({
    by: ["lessonId"],
    where: { lessonId: { in: lessonIds } },
    _count: { _all: true },
  });
  return new Map(groups.map((g) => [g.lessonId, g._count._all]));
}
