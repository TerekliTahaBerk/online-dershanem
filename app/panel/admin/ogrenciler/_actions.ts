"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { normalizePhone } from "@/lib/auth-utils";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { StudentStatus } from "@prisma/client";

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function opt(v: string): string | null { return v.length === 0 ? null : v; }

export async function createStudentAction(fd: FormData) {
  await requirePanelRole("admin");
  const fullName = readStr(fd, "fullName");
  const phoneRaw = readStr(fd, "phone");
  if (!fullName || !phoneRaw) throw new Error("Ad ve telefon zorunlu");
  const phoneKey = normalizePhone(phoneRaw);
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
  revalidatePath("/panel/admin/ogrenciler");
  redirect(`/panel/admin/ogrenciler/${created.id}`);
}

export async function updateStudentAction(id: string, fd: FormData) {
  await requirePanelRole("admin");
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
  revalidatePath(`/panel/admin/ogrenciler/${id}`);
  revalidatePath("/panel/admin/ogrenciler");
}

export async function deleteStudentAction(id: string) {
  await requirePanelRole("admin");
  await prisma.student.delete({ where: { id } });
  revalidatePath("/panel/admin/ogrenciler");
  redirect("/panel/admin/ogrenciler");
}
