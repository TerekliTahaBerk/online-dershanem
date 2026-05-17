"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { normalizePhone } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StudentStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(v: string): string | null { return v.length === 0 ? null : v; }

export async function createStudentAction(fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  const phoneRaw = readStr(fd, "phone");
  if (!fullName || !phoneRaw) throw new Error("Ad ve telefon zorunlu");
  const phoneKey = normalizePhone(phoneRaw);
  const classroomId = opt(readStr(fd, "classroomId"));
  const parentId = opt(readStr(fd, "parentId"));
  const created = await prisma.student.create({
    data: {
      fullName,
      phone: phoneRaw,
      phoneKey,
      email: opt(readStr(fd, "email")),
      city: opt(readStr(fd, "city")),
      district: opt(readStr(fd, "district")),
      schoolName: opt(readStr(fd, "schoolName")),
      classLevel: opt(readStr(fd, "classLevel")),
      examType: opt(readStr(fd, "examType")),
      targetGoal: opt(readStr(fd, "targetGoal")),
      status: (readStr(fd, "status") as StudentStatus) || "NEW",
    },
  });
  if (classroomId) {
    await prisma.classroomStudent.create({ data: { classroomId, studentId: created.id } });
  }
  if (parentId) {
    await prisma.parentStudent.create({
      data: {
        parentId, studentId: created.id,
        relationship: opt(readStr(fd, "parentRelationship")),
        isPrimary: fd.get("parentIsPrimary") === "on",
      },
    });
  }
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: created.id,
    action: "STUDENT_CREATE",
    summary: fullName,
    payload: { phoneKey, classroomId, parentId },
  });
  revalidatePath("/panel/admin/ogrenciler");
  redirect(`/panel/admin/ogrenciler/${created.id}`);
}

export async function updateStudentAction(id: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Ad zorunlu");
  await prisma.student.update({
    where: { id },
    data: {
      fullName,
      email: opt(readStr(fd, "email")),
      city: opt(readStr(fd, "city")),
      district: opt(readStr(fd, "district")),
      schoolName: opt(readStr(fd, "schoolName")),
      classLevel: opt(readStr(fd, "classLevel")),
      examType: opt(readStr(fd, "examType")),
      targetGoal: opt(readStr(fd, "targetGoal")),
      status: (readStr(fd, "status") as StudentStatus) || "NEW",
      notes: opt(readStr(fd, "notes")),
    },
  });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: id,
    action: "STUDENT_UPDATE",
    summary: fullName,
  });
  revalidatePath(`/panel/admin/ogrenciler/${id}`);
  revalidatePath("/panel/admin/ogrenciler");
}

export async function deleteStudentAction(id: string) {
  const ctx = await requirePanelRole("admin");
  const existing = await prisma.student.findUnique({
    where: { id },
    select: { fullName: true, phoneKey: true, email: true },
  });
  await prisma.student.delete({ where: { id } });
  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Student",
    entityId: id,
    action: "STUDENT_DELETE",
    summary: existing?.fullName || id,
    payload: {
      phoneKey: existing?.phoneKey,
      email: existing?.email,
      kvkkHardDelete: true,
    },
  });
  revalidatePath("/panel/admin/ogrenciler");
  redirect("/panel/admin/ogrenciler");
}

// ─── Relations ───────────────────────────────────────────────────────────────

export async function assignStudentToClassroomAction(studentId: string, fd: FormData) {
  await requirePanelRole("admin");
  const classroomId = readStr(fd, "classroomId");
  if (!classroomId) throw new Error("Sınıf zorunlu");
  await prisma.classroomStudent.upsert({
    where: { classroomId_studentId: { classroomId, studentId } },
    update: {},
    create: { classroomId, studentId },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
}

export async function removeStudentFromClassroomAction(studentId: string, classroomId: string) {
  await requirePanelRole("admin");
  await prisma.classroomStudent.delete({
    where: { classroomId_studentId: { classroomId, studentId } },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/siniflar/${classroomId}/duzenle`);
}

export async function assignPackageToStudentAction(studentId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const packageId = readStr(fd, "packageId");
  if (!packageId) throw new Error("Paket zorunlu");
  await prisma.studentPackage.upsert({
    where: { studentId_packageId: { studentId, packageId } },
    update: { revokedAt: null, notes: opt(readStr(fd, "notes")) },
    create: {
      studentId, packageId,
      assignedById: ctx.userId,
      notes: opt(readStr(fd, "notes")),
    },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function removePackageFromStudentAction(studentId: string, packageId: string) {
  await requirePanelRole("admin");
  await prisma.studentPackage.delete({
    where: { studentId_packageId: { studentId, packageId } },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
}

export async function linkParentToStudentAction(studentId: string, fd: FormData) {
  await requirePanelRole("admin");
  const parentId = readStr(fd, "parentId");
  if (!parentId) throw new Error("Veli zorunlu");
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: {
      relationship: opt(readStr(fd, "relationship")),
      isPrimary: fd.get("isPrimary") === "on",
    },
    create: {
      parentId, studentId,
      relationship: opt(readStr(fd, "relationship")),
      isPrimary: fd.get("isPrimary") === "on",
    },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
}

export async function unlinkParentFromStudentAction(studentId: string, parentId: string) {
  await requirePanelRole("admin");
  await prisma.parentStudent.delete({
    where: { parentId_studentId: { parentId, studentId } },
  });
  revalidatePath(`/panel/admin/ogrenciler/${studentId}/duzenle`);
  revalidatePath(`/panel/admin/veliler/${parentId}/duzenle`);
}
