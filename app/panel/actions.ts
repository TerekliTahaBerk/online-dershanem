"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

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
