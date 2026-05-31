"use server";

import { headers } from "next/headers";
import { getServerAuthSession } from "@/lib/auth";
import { changePasswordForUser, getPostLoginRedirectForRole } from "@/lib/panel/account-onboarding";
import { log } from "@/lib/logger";
import type { UserRole } from "@prisma/client";

/**
 * Phase 3 / Session 2 — change password (forced or voluntary).
 *
 * After success we ask the client to redirect to the role's dashboard.
 * NextAuth will re-issue the JWT (which now has `mustChangePassword: false`)
 * on the next request because the JWT callback re-reads the DB.
 */
export async function changePasswordAction(
  formData: FormData,
): Promise<{ ok: true; redirectTo: string } | { ok: false; message: string }> {
  const session = await getServerAuthSession();
  if (!session?.user?.id) {
    return { ok: false, message: "Oturum bulunamadı. Lütfen tekrar giriş yapın." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword) return { ok: false, message: "Mevcut şifre zorunludur." };
  if (newPassword !== confirmPassword) {
    return { ok: false, message: "Yeni şifreler eşleşmiyor." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

  const res = await changePasswordForUser({
    userId: session.user.id,
    currentPassword,
    newPassword,
    ip,
  });
  if (!res.ok) {
    log.warn("password.change_failed", { userId: session.user.id, reason: res.reason });
    return { ok: false, message: res.message };
  }

  log.info("password.change_ok", { userId: session.user.id });
  const role = (session.user.role ?? "STUDENT") as UserRole;
  return { ok: true, redirectTo: getPostLoginRedirectForRole(role) };
}
