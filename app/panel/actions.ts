"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

export async function updateStudentProfileAction(formData: FormData) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { student: true },
  });
  if (!user?.student) redirect("/panel");

  const get = (key: string) =>
    (formData.get(key) as string | null)?.trim() || null;

  await prisma.student.update({
    where: { id: user.student.id },
    data: {
      phone:         get("phone") ?? user.student.phone,
      city:          get("city"),
      district:      get("district"),
      schoolName:    get("schoolName"),
      classLevel:    get("classLevel"),
      examType:      get("examType"),
      department:    get("department"),
      targetGoal:    get("targetGoal"),
      targetSchool:  get("targetSchool"),
      targetRanking: get("targetRanking"),
      currentNet:    get("currentNet"),
      strongLessons: get("strongLessons"),
      weakLessons:   get("weakLessons"),
      parentFullName: get("parentFullName"),
      parentPhone:    get("parentPhone"),
      parentEmail:    get("parentEmail"),
    },
  });

  revalidatePath("/panel/profil");
  redirect("/panel/profil?success=profile");
}

export async function changePasswordAction(formData: FormData) {
  const session = await getServerAuthSession();
  if (!session?.user?.id) redirect("/giris");

  const currentPassword = (formData.get("currentPassword") as string | null)?.trim() ?? "";
  const newPassword = (formData.get("newPassword") as string | null)?.trim() ?? "";
  const confirmPassword = (formData.get("confirmPassword") as string | null)?.trim() ?? "";

  if (!currentPassword || !newPassword || !confirmPassword) {
    redirect("/panel/profil?error=missing");
  }

  if (newPassword.length < 6) {
    redirect("/panel/profil?error=short");
  }

  if (newPassword !== confirmPassword) {
    redirect("/panel/profil?error=mismatch");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/giris");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    redirect("/panel/profil?error=wrong");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash },
  });

  revalidatePath("/panel/profil");
  redirect("/panel/profil?success=password");
}
