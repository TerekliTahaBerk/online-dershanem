"use server";

import { TeacherStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { getPanelAccess } from "@/lib/panel-access";
import { linkTeacherToExistingUserByEmail } from "@/lib/user-links";
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

  const teacher = await prisma.teacher.create({
    data: { fullName, email: email || undefined, phone, subjects, bio, status: "ACTIVE" }
  });

  const linkResult = await linkTeacherToExistingUserByEmail(teacher.id, email);

  revalidatePath("/admin/hocalar");
  redirect(`/admin/hocalar?updated=${linkResult.status === "linked" ? "created-linked" : "created"}`);
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

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { userId: true, email: true }
  });

  if (teacher && !teacher.userId) {
    await linkTeacherToExistingUserByEmail(teacherId, teacher.email);
  }

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
    select: { id: true, role: true, name: true }
  });

  if (existing) {
    const linkResult = await linkTeacherToExistingUserByEmail(teacherId, email);

    if (linkResult.status === "linked" || linkResult.status === "already-linked") {
      if ((existing.role === "TEACHER" && grantAdminAccess) || !existing.name) {
        await prisma.user.update({
          where: { id: existing.id },
          data: {
            name: existing.name ?? name ?? teacher.fullName,
            ...(existing.role === "TEACHER" && grantAdminAccess ? { role: "ADMIN" } : {})
          }
        });
      }

      revalidatePath("/admin/hocalar");
      redirect(`/admin/hocalar?updated=account-linked&teacher=${teacherId}`);
    }

    redirect(`/admin/hocalar?updated=email-taken&teacher=${teacherId}`);
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
        role: grantAdminAccess ? "ADMIN" : "TEACHER"
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
    data: { role: currentValue === "true" ? "TEACHER" : "ADMIN" }
  });

  revalidatePath("/admin/hocalar");
  redirect(`/admin/hocalar?updated=admin-access&teacher=${teacherId}`);
}

export async function deleteTeacherAction(formData: FormData) {
  await requireAdmin();

  const teacherId = readString(formData, "teacherId");

  if (!teacherId) {
    redirect("/admin/hocalar");
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      user: {
        select: {
          id: true,
          role: true
        }
      }
    }
  });

  if (!teacher) {
    redirect("/admin/hocalar");
  }

  await prisma.teacher.delete({
    where: { id: teacherId }
  });

  if (teacher.user && teacher.user.role === "TEACHER") {
    await prisma.user.delete({
      where: { id: teacher.user.id }
    });
  }

  revalidatePath("/admin/hocalar");
  revalidatePath("/ogretmen");
  redirect("/admin/hocalar?updated=deleted");
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
