"use server";

import { TeacherStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { sendTeacherWelcome } from "@/lib/email";

function readString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function requireAdmin() {
  const session = await getServerAuthSession();
  if (!getPanelAccess(session?.user).hasAdminPanel) {
    redirect("/giris");
  }
}

export async function createTeacherAction(formData: FormData) {
  await requireAdmin();

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
  await requireAdmin();

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
  await requireAdmin();

  const teacherId = readString(formData, "teacherId");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const name = readString(formData, "name");
  const grantAdminAccess = formData.get("grantAdminAccess") === "on";

  if (!teacherId || !email) {
    redirect(`/admin/hocalar?error=missing&teacher=${teacherId}`);
  }

  // Check if teacher already has an account
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) redirect("/admin/hocalar");
  if (teacher.userId) redirect(`/admin/hocalar?updated=account-exists&teacher=${teacherId}`);

  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      teacher: { select: { id: true } },
      student: { select: { id: true } }
    }
  });

  if (existing) {
    if (existing.teacher || existing.student) {
      redirect(`/admin/hocalar?updated=email-taken&teacher=${teacherId}`);
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: existing.name ?? name ?? teacher.fullName,
        isAdmin: existing.isAdmin || grantAdminAccess
      }
    });

    await prisma.teacher.update({
      where: { id: teacherId },
      data: { userId: existing.id }
    });

    revalidatePath("/admin/hocalar");
    redirect(`/admin/hocalar?updated=account-linked&teacher=${teacherId}`);
  }

  if (!password || password.length < 6) {
    redirect(`/admin/hocalar?updated=password-short&teacher=${teacherId}`);
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email,
        name: name || teacher.fullName,
        passwordHash,
        role: "TEACHER",
        isAdmin: grantAdminAccess
      },
    });
    await prisma.teacher.update({
      where: { id: teacherId },
      data: { userId: user.id },
    });

    await sendTeacherWelcome({ to: email, name: name || teacher.fullName, email, password });
  } catch {
    redirect(`/admin/hocalar?updated=account-error&teacher=${teacherId}`);
  }

  revalidatePath("/admin/hocalar");
  redirect(`/admin/hocalar?updated=account-created&teacher=${teacherId}`);
}

export async function toggleTeacherAdminAccessAction(formData: FormData) {
  await requireAdmin();

  const teacherId = readString(formData, "teacherId");
  const userId = readString(formData, "userId");
  const currentValue = readString(formData, "currentValue");

  if (!teacherId || !userId) {
    redirect("/admin/hocalar");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isAdmin: currentValue !== "true" }
  });

  revalidatePath("/admin/hocalar");
  redirect(`/admin/hocalar?updated=admin-access&teacher=${teacherId}`);
}

export async function toggleTeacherStatusAction(formData: FormData) {
  await requireAdmin();

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
