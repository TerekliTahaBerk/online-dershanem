"use server";

import { headers } from "next/headers";
import { consumeUserInviteToken, getPostLoginRedirectForRole } from "@/lib/panel/account-onboarding";
import { log } from "@/lib/logger";

/**
 * Phase 3 / Session 2 — invite acceptance action.
 *
 * Validates the form, atomically consumes the token (single-use), and tells
 * the client where to go next (the login page, with the role's panel as
 * `callbackUrl`). We deliberately do NOT auto-sign-in the user — they should
 * type their new password once more, both as muscle memory and as a security
 * defense (token leakage shouldn't grant a session).
 */
export async function consumeInviteAction(
  formData: FormData,
): Promise<{ ok: true; redirectTo: string } | { ok: false; message: string }> {
  const token = String(formData.get("token") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) return { ok: false, message: "Davet bağlantısı geçersiz." };
  if (newPassword !== confirmPassword) {
    return { ok: false, message: "Şifreler eşleşmiyor." };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = h.get("user-agent");

  const res = await consumeUserInviteToken({ token, newPassword, ip, userAgent });
  if (!res.ok) {
    log.warn("invite.consume_failed", { reason: res.reason });
    return { ok: false, message: res.message };
  }

  log.info("invite.consume_ok", { userId: res.userId, role: res.role });
  const callback = getPostLoginRedirectForRole(res.role);
  return { ok: true, redirectTo: `/giris?callbackUrl=${encodeURIComponent(callback)}` };
}
