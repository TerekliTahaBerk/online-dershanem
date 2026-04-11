"use server";

import { LessonStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalDate(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createLessonAction(formData: FormData) {
  const studentId = readString(formData, "studentId");
  const teacherId = readString(formData, "teacherId");
  const packageId = readString(formData, "packageId") || null;
  const scheduledAt = readOptionalDate(formData, "scheduledAt");
  const duration = parseInt(readString(formData, "duration") || "60", 10);
  const googleMeetLink = readString(formData, "googleMeetLink") || null;
  const notes = readString(formData, "notes") || null;

  if (!studentId || !teacherId || !scheduledAt) {
    redirect("/admin/dersler/yeni?error=missing");
  }

  await prisma.lesson.create({
    data: {
      studentId,
      teacherId,
      packageId,
      scheduledAt,
      duration: isNaN(duration) ? 60 : duration,
      googleMeetLink,
      notes,
      status: "SCHEDULED"
    }
  });

  revalidatePath("/admin/dersler");
  revalidatePath("/admin");
  redirect("/admin/dersler");
}

export async function updateLessonAction(formData: FormData) {
  const lessonId = readString(formData, "lessonId");
  const status = readString(formData, "status") as LessonStatus;
  const scheduledAt = readOptionalDate(formData, "scheduledAt");
  const googleMeetLink = readString(formData, "googleMeetLink") || null;
  const notes = readString(formData, "notes") || null;
  const returnTo = readString(formData, "returnTo") || "/admin/dersler";

  if (!lessonId || !Object.values(LessonStatus).includes(status)) {
    redirect("/admin/dersler?error=invalid");
  }

  await prisma.lesson.update({
    where: { id: lessonId },
    data: {
      status,
      ...(scheduledAt ? { scheduledAt } : {}),
      googleMeetLink,
      notes
    }
  });

  revalidatePath("/admin/dersler");
  revalidatePath("/admin");
  redirect(`${returnTo}&updated=lesson`);
}

export async function cancelLessonAction(formData: FormData) {
  const lessonId = readString(formData, "lessonId");
  const returnTo = readString(formData, "returnTo") || "/admin/dersler";

  if (!lessonId) redirect("/admin/dersler");

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: "CANCELLED" }
  });

  revalidatePath("/admin/dersler");
  revalidatePath("/admin");
  redirect(`${returnTo}&updated=cancelled`);
}
