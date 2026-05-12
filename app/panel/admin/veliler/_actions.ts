"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { normalizePhone } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export async function createParentAction(fd: FormData) {
  await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Ad zorunlu");
  const phone = readStr(fd, "phone");
  await prisma.parent.create({
    data: {
      fullName,
      phone: phone || null,
      phoneKey: phone ? normalizePhone(phone) : null,
      email: readStr(fd, "email") || null,
      notes: readStr(fd, "notes") || null,
    },
  });
  revalidatePath("/panel/admin/veliler");
}

export async function linkChildAction(parentId: string, fd: FormData) {
  await requirePanelRole("admin");
  const studentId = readStr(fd, "studentId");
  if (!studentId) throw new Error("Öğrenci zorunlu");
  await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId, studentId } },
    update: { relationship: readStr(fd, "relationship") || null, isPrimary: fd.get("isPrimary") === "on" },
    create: {
      parentId, studentId,
      relationship: readStr(fd, "relationship") || null,
      isPrimary: fd.get("isPrimary") === "on",
    },
  });
  revalidatePath("/panel/admin/veliler");
}

export async function unlinkChildAction(parentId: string, studentId: string) {
  await requirePanelRole("admin");
  await prisma.parentStudent.delete({ where: { parentId_studentId: { parentId, studentId } } });
  revalidatePath("/panel/admin/veliler");
}

export async function updateParentAction(id: string, fd: FormData) {
  await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  if (!fullName) throw new Error("Ad zorunlu");
  const phone = readStr(fd, "phone");
  await prisma.parent.update({
    where: { id },
    data: {
      fullName,
      phone: phone || null,
      phoneKey: phone ? normalizePhone(phone) : null,
      email: readStr(fd, "email") || null,
      notes: readStr(fd, "notes") || null,
    },
  });
  revalidatePath("/panel/admin/veliler");
}

export async function deleteParentAction(id: string) {
  await requirePanelRole("admin");
  await prisma.parent.delete({ where: { id } });
  revalidatePath("/panel/admin/veliler");
}
