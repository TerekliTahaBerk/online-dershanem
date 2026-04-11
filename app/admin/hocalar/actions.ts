"use server";

import { TeacherStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function createTeacherAction(formData: FormData) {
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email") || null;
  const phone = readString(formData, "phone") || null;
  const subjects = readString(formData, "subjects");
  const bio = readString(formData, "bio") || null;

  if (!fullName || !subjects) {
    redirect("/admin/hocalar/yeni?error=missing");
  }

  await prisma.teacher.create({
    data: { fullName, email: email || undefined, phone, subjects, bio, status: "ACTIVE" }
  });

  revalidatePath("/admin/hocalar");
  redirect("/admin/hocalar?updated=created");
}

export async function updateTeacherAction(formData: FormData) {
  const teacherId = readString(formData, "teacherId");
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email") || null;
  const phone = readString(formData, "phone") || null;
  const subjects = readString(formData, "subjects");
  const bio = readString(formData, "bio") || null;
  const status = readString(formData, "status") as TeacherStatus;
  const returnTo = readString(formData, "returnTo") || "/admin/hocalar";

  if (!teacherId || !fullName || !subjects || !Object.values(TeacherStatus).includes(status)) {
    redirect("/admin/hocalar?error=invalid");
  }

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { fullName, email: email || undefined, phone, subjects, bio, status }
  });

  revalidatePath("/admin/hocalar");
  redirect(`${returnTo}&updated=teacher`);
}

export async function toggleTeacherStatusAction(formData: FormData) {
  const teacherId = readString(formData, "teacherId");
  const currentStatus = readString(formData, "currentStatus") as TeacherStatus;

  if (!teacherId) redirect("/admin/hocalar");

  const newStatus: TeacherStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  await prisma.teacher.update({
    where: { id: teacherId },
    data: { status: newStatus }
  });

  revalidatePath("/admin/hocalar");
  redirect("/admin/hocalar?updated=toggle");
}
