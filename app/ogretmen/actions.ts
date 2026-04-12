"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { sendLessonCompleted, sendLessonCancelled } from "@/lib/email";

async function requireTeacher() {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");
  if (session.user.role !== "TEACHER") redirect("/giris");
  return session.user.id;
}

// Update lesson notes without changing status
export async function updateLessonNotesAction(formData: FormData) {
  const userId = await requireTeacher();
  const lessonId = formData.get("lessonId") as string;
  const notes = (formData.get("notes") as string) ?? "";
  const tab = (formData.get("tab") as string) ?? "upcoming";

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { teacher: { select: { userId: true } } },
  });

  if (!lesson || lesson.teacher.userId !== userId) redirect("/ogretmen/dersler");

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { notes: notes.trim() || null },
  });

  revalidatePath("/ogretmen/dersler");
  redirect(`/ogretmen/dersler?tab=${tab}&edit=${lessonId}`);
}

// Mark lesson as completed (optionally with notes)
export async function completeLessonAction(formData: FormData) {
  const userId = await requireTeacher();
  const lessonId = formData.get("lessonId") as string;
  const notes = (formData.get("notes") as string) ?? "";
  const tab = (formData.get("tab") as string) ?? "upcoming";

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      teacher: { select: { userId: true, fullName: true } },
      student: { select: { fullName: true, email: true } },
    },
  });

  if (!lesson || lesson.teacher.userId !== userId) redirect("/ogretmen/dersler");

  const finalNotes = notes.trim() || lesson.notes || null;

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: "COMPLETED", notes: finalNotes },
  });

  await sendLessonCompleted({
    studentEmail: lesson.student.email,
    studentName: lesson.student.fullName,
    teacherName: lesson.teacher.fullName,
    scheduledAt: lesson.scheduledAt,
    notes: finalNotes,
  });

  revalidatePath("/ogretmen/dersler");
  redirect(`/ogretmen/dersler?tab=${tab}`);
}

// Cancel a lesson
export async function cancelLessonAction(formData: FormData) {
  const userId = await requireTeacher();
  const lessonId = formData.get("lessonId") as string;
  const tab = (formData.get("tab") as string) ?? "upcoming";

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      teacher: { select: { userId: true, fullName: true, email: true } },
      student: { select: { fullName: true, email: true } },
    },
  });

  if (!lesson || lesson.teacher.userId !== userId) redirect("/ogretmen/dersler");

  await prisma.lesson.update({
    where: { id: lessonId },
    data: { status: "CANCELLED" },
  });

  await sendLessonCancelled({
    studentEmail: lesson.student.email,
    studentName: lesson.student.fullName,
    teacherEmail: lesson.teacher.email,
    teacherName: lesson.teacher.fullName,
    scheduledAt: lesson.scheduledAt,
  });

  revalidatePath("/ogretmen/dersler");
  redirect(`/ogretmen/dersler?tab=${tab}`);
}

// Update teacher profile (name, phone, subjects, bio)
export async function updateTeacherProfileAction(formData: FormData) {
  const userId = await requireTeacher();

  const fullName = (formData.get("fullName") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const subjects = (formData.get("subjects") as string)?.trim();
  const bio = (formData.get("bio") as string)?.trim() || null;

  if (!fullName || !subjects) {
    redirect("/ogretmen/profil?error=profile-error");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { teacher: true },
    });

    if (!user?.teacher) redirect("/ogretmen/profil?error=profile-error");

    await prisma.teacher.update({
      where: { id: user.teacher.id },
      data: { fullName, phone, subjects, bio },
    });

    // Also update the user's display name
    await prisma.user.update({
      where: { id: userId },
      data: { name: fullName },
    });
  } catch {
    redirect("/ogretmen/profil?error=profile-error");
  }

  revalidatePath("/ogretmen");
  redirect("/ogretmen/profil?success=profile");
}

// Change password
export async function changeTeacherPasswordAction(formData: FormData) {
  const userId = await requireTeacher();

  const currentPassword = (formData.get("currentPassword") as string) ?? "";
  const newPassword = (formData.get("newPassword") as string) ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string) ?? "";

  if (newPassword.length < 6) redirect("/ogretmen/profil?error=password-short");
  if (newPassword !== confirmPassword) redirect("/ogretmen/profil?error=password-mismatch");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/giris");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) redirect("/ogretmen/profil?error=wrong-password");

  const hash = await bcrypt.hash(newPassword, 12);

  try {
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash } });
  } catch {
    redirect("/ogretmen/profil?error=password-error");
  }

  redirect("/ogretmen/profil?success=password");
}
