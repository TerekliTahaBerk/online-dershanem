"use server";

import { TeacherStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
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

export async function createTeacherAccountAction(formData: FormData) {
  const teacherId = readString(formData, "teacherId");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const name = readString(formData, "name");

  if (!teacherId || !email || !password) {
    redirect(`/admin/hocalar?error=missing&teacher=${teacherId}`);
  }

  // Check if teacher already has an account
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) redirect("/admin/hocalar");
  if (teacher.userId) redirect(`/admin/hocalar?updated=account-exists&teacher=${teacherId}`);

  // Check email not taken
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) redirect(`/admin/hocalar?updated=email-taken&teacher=${teacherId}`);

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: name || teacher.fullName,
        passwordHash,
        role: "TEACHER",
      },
    });
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { userId: user.id },
    });
  } catch {
    redirect(`/admin/hocalar?updated=account-error&teacher=${teacherId}`);
  }

  revalidatePath("/admin/hocalar");
  redirect(`/admin/hocalar?updated=account-created&teacher=${teacherId}`);
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
