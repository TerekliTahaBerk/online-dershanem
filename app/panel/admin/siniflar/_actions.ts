"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { ClassroomLevel } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createClassroomAction(fd: FormData) {
  await requirePanelRole("admin");
  const name = readStr(fd, "name");
  if (!name) throw new Error("Ad zorunlu");
  const cap = parseInt(readStr(fd, "capacity") || "30", 10);
  await prisma.classroom.create({
    data: {
      name,
      branch: readStr(fd, "branch") || null,
      level: (readStr(fd, "level") as ClassroomLevel) || "MIXED",
      capacity: Number.isFinite(cap) ? cap : 30,
      description: readStr(fd, "description") || null,
    },
  });
  revalidatePath("/panel/admin/siniflar");
}

export async function updateClassroomAction(id: string, fd: FormData) {
  await requirePanelRole("admin");
  const name = readStr(fd, "name");
  if (!name) throw new Error("Ad zorunlu");
  const cap = parseInt(readStr(fd, "capacity") || "30", 10);
  await prisma.classroom.update({
    where: { id },
    data: {
      name,
      branch: readStr(fd, "branch") || null,
      level: (readStr(fd, "level") as ClassroomLevel) || "MIXED",
      capacity: Number.isFinite(cap) ? cap : 30,
      description: readStr(fd, "description") || null,
      isActive: fd.get("isActive") === "on",
    },
  });
  revalidatePath("/panel/admin/siniflar");
}

export async function deleteClassroomAction(id: string) {
  await requirePanelRole("admin");
  await prisma.classroom.delete({ where: { id } });
  revalidatePath("/panel/admin/siniflar");
}

// ─── Relations ───────────────────────────────────────────────────────────────

export async function addStudentToClassroomAction(classroomId: string, fd: FormData) {
  await requirePanelRole("admin");
  const studentId = readStr(fd, "studentId");
  if (!studentId) throw new Error("Öğrenci zorunlu");
  await prisma.classroomStudent.upsert({
    where: { classroomId_studentId: { classroomId, studentId } },
    update: {},
    create: { classroomId, studentId },
  });
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function removeStudentFromClassroomAction(classroomId: string, studentId: string) {
  await requirePanelRole("admin");
  await prisma.classroomStudent.delete({
    where: { classroomId_studentId: { classroomId, studentId } },
  });
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function addTeacherToClassroomAction(classroomId: string, fd: FormData) {
  await requirePanelRole("admin");
  const teacherId = readStr(fd, "teacherId");
  if (!teacherId) throw new Error("Öğretmen zorunlu");
  await prisma.classroomTeacher.upsert({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    update: {
      isLead: fd.get("isLead") === "on",
      subject: readStr(fd, "subject") || null,
    },
    create: {
      classroomId, teacherId,
      isLead: fd.get("isLead") === "on",
      subject: readStr(fd, "subject") || null,
    },
  });
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
  revalidatePath(`/panel/admin/ogretmenler/${teacherId}/duzenle`);
}

export async function removeTeacherFromClassroomAction(classroomId: string, teacherId: string) {
  await requirePanelRole("admin");
  await prisma.classroomTeacher.delete({
    where: { classroomId_teacherId: { classroomId, teacherId } },
  });
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
  revalidatePath(`/panel/admin/ogretmenler/${teacherId}/duzenle`);
}
