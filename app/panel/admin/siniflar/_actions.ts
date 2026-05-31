"use server";
/**
 * Phase 3 / Session 7 - Classroom operational actions.
 * Admin-only writes. All mutations idempotent (composite-PK upsert) and audited.
 * Duplicate (name, branch) is blocked with a friendly Turkish error.
 */
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { ClassroomLevel } from "@prisma/client";
import { logAudit } from "@/lib/audit";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createClassroomAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const name = readStr(fd, "name");
  if (!name) throw new Error("Ad zorunlu");
  const branch = readStr(fd, "branch") || null;
  const dup = await prisma.classroom.findFirst({
    where: { name, branch },
    select: { id: true },
  });
  if (dup) {
    throw new Error(
      branch
        ? `Bu isim+sube zaten var: "${name} / ${branch}"`
        : `Bu isimde bir sinif zaten var: "${name}"`,
    );
  }
  const cap = parseInt(readStr(fd, "capacity") || "30", 10);
  if (!Number.isFinite(cap) || cap <= 0) throw new Error("Kapasite pozitif olmali");
  const level = (readStr(fd, "level") as ClassroomLevel) || "MIXED";
  const created = await prisma.classroom.create({
    data: {
      name,
      branch,
      level,
      capacity: cap,
      description: readStr(fd, "description") || null,
    },
    select: { id: true },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Classroom",
    entityId: created.id,
    action: "CLASSROOM_CREATE",
    summary: name,
    payload: { branch, level, capacity: cap },
  });
  revalidatePath("/panel/admin/siniflar");
}

export async function updateClassroomAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const name = readStr(fd, "name");
  if (!name) throw new Error("Ad zorunlu");
  const branch = readStr(fd, "branch") || null;
  const dup = await prisma.classroom.findFirst({
    where: { name, branch, NOT: { id } },
    select: { id: true },
  });
  if (dup) {
    throw new Error(
      branch
        ? `Bu isim+sube baska bir sinifta kullaniliyor: "${name} / ${branch}"`
        : `Bu isimde baska bir sinif var: "${name}"`,
    );
  }
  const cap = parseInt(readStr(fd, "capacity") || "30", 10);
  if (!Number.isFinite(cap) || cap <= 0) throw new Error("Kapasite pozitif olmali");
  await prisma.classroom.update({
    where: { id },
    data: {
      name,
      branch,
      level: (readStr(fd, "level") as ClassroomLevel) || "MIXED",
      capacity: cap,
      description: readStr(fd, "description") || null,
      isActive: fd.get("isActive") === "on",
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Classroom",
    entityId: id,
    action: "CLASSROOM_UPDATE",
    summary: name,
  });
  revalidatePath("/panel/admin/siniflar");
  revalidatePath(`/panel/admin/siniflar/${id}`);
  revalidatePath(`/panel/admin/siniflar/${id}/duzenle`);
}

export async function deleteClassroomAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const existing = await prisma.classroom.findUnique({
    where: { id },
    select: { name: true, branch: true },
  });
  await prisma.classroom.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Classroom",
    entityId: id,
    action: "CLASSROOM_DELETE",
    summary: existing?.name || id,
    payload: { branch: existing?.branch ?? null },
  });
  revalidatePath("/panel/admin/siniflar");
}

export async function addStudentToClassroomAction(classroomId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const studentId = readStr(fd, "studentId");
  if (!studentId) throw new Error("Ogrenci zorunlu");
  const existing = await prisma.classroomStudent.findUnique({
    where: { classroomId_studentId: { classroomId, studentId } },
    select: { classroomId: true },
  });
  await prisma.classroomStudent.upsert({
    where: { classroomId_studentId: { classroomId, studentId } },
    update: {},
    create: { classroomId, studentId },
  });
  if (!existing) {
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "ClassroomStudent",
      entityId: `${classroomId}:${studentId}`,
      action: "CLASSROOM_STUDENT_ASSIGN",
      payload: { classroomId, studentId },
    });
  }
  revalidatePath(`/panel/admin/siniflar/${classroomId}`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function bulkAssignStudentsToClassroomAction(
  classroomId: string,
  fd: FormData,
) {
  const ctx = await requirePanelRole("admin");
  const ids = fd
    .getAll("studentIds")
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
  if (ids.length === 0) throw new Error("Hic ogrenci secilmedi");
  const existing = await prisma.classroomStudent.findMany({
    where: { classroomId, studentId: { in: ids } },
    select: { studentId: true },
  });
  const already = new Set(existing.map((e) => e.studentId));
  const toAdd = ids.filter((id) => !already.has(id));
  if (toAdd.length > 0) {
    await prisma.classroomStudent.createMany({
      data: toAdd.map((studentId) => ({ classroomId, studentId })),
      skipDuplicates: true,
    });
    await logAudit({
      actorUserId: ctx.userId,
      entityType: "ClassroomStudent",
      entityId: classroomId,
      action: "CLASSROOM_STUDENT_ASSIGN_BATCH",
      summary: `${toAdd.length} ogrenci atandi`,
      payload: {
        classroomId,
        addedStudentIds: toAdd,
        skippedAlreadyAssigned: Array.from(already),
      },
    });
  }
  revalidatePath(`/panel/admin/siniflar/${classroomId}`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
}

export async function removeStudentFromClassroomAction(
  classroomId: string,
  studentId: string,
) {
  const ctx = await requirePanelRole("admin");
  await prisma.classroomStudent.delete({
    where: { classroomId_studentId: { classroomId, studentId } },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "ClassroomStudent",
    entityId: `${classroomId}:${studentId}`,
    action: "CLASSROOM_STUDENT_REMOVE",
    payload: { classroomId, studentId },
  });
  revalidatePath(`/panel/admin/siniflar/${classroomId}`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function addTeacherToClassroomAction(classroomId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const teacherId = readStr(fd, "teacherId");
  if (!teacherId) throw new Error("Ogretmen zorunlu");
  const isLead = fd.get("isLead") === "on";
  const subject = readStr(fd, "subject") || null;
  const existing = await prisma.classroomTeacher.findUnique({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    select: { classroomId: true },
  });
  await prisma.classroomTeacher.upsert({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    update: { isLead, subject },
    create: { classroomId, teacherId, isLead, subject },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "ClassroomTeacher",
    entityId: `${classroomId}:${teacherId}`,
    action: existing ? "CLASSROOM_TEACHER_UPDATE" : "CLASSROOM_TEACHER_ASSIGN",
    payload: { classroomId, teacherId, isLead, subject },
  });
  revalidatePath(`/panel/admin/siniflar/${classroomId}`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
  revalidatePath(`/panel/admin/ogretmenler/${teacherId}/duzenle`);
}

export async function removeTeacherFromClassroomAction(
  classroomId: string,
  teacherId: string,
) {
  const ctx = await requirePanelRole("admin");
  await prisma.classroomTeacher.delete({
    where: { classroomId_teacherId: { classroomId, teacherId } },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "ClassroomTeacher",
    entityId: `${classroomId}:${teacherId}`,
    action: "CLASSROOM_TEACHER_REMOVE",
    payload: { classroomId, teacherId },
  });
  revalidatePath(`/panel/admin/siniflar/${classroomId}`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
  revalidatePath(`/panel/admin/ogretmenler/${teacherId}/duzenle`);
}
