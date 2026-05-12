"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { TeacherStatus } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(v: string): string | null { return v.length === 0 ? null : v; }

export async function createTeacherAction(fd: FormData) {
  await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  const subjects = readStr(fd, "subjects");
  if (!fullName || !subjects) throw new Error("Ad ve branş zorunlu");
  await prisma.teacher.create({
    data: {
      fullName, subjects,
      email: opt(readStr(fd, "email")),
      phone: opt(readStr(fd, "phone")),
      bio: opt(readStr(fd, "bio")),
      status: (readStr(fd, "status") as TeacherStatus) || "ACTIVE",
    },
  });
  revalidatePath("/panel/admin/ogretmenler");
}

export async function updateTeacherAction(id: string, fd: FormData) {
  await requirePanelRole("admin");
  await prisma.teacher.update({
    where: { id },
    data: {
      fullName: readStr(fd, "fullName"),
      subjects: readStr(fd, "subjects"),
      email: opt(readStr(fd, "email")),
      phone: opt(readStr(fd, "phone")),
      bio: opt(readStr(fd, "bio")),
      status: (readStr(fd, "status") as TeacherStatus) || "ACTIVE",
    },
  });
  revalidatePath("/panel/admin/ogretmenler");
}

export async function deleteTeacherAction(id: string) {
  await requirePanelRole("admin");
  await prisma.teacher.delete({ where: { id } });
  revalidatePath("/panel/admin/ogretmenler");
}
