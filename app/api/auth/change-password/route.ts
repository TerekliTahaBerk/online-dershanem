import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { getSession, revokeAllUserSessions } from "@/lib/auth/session";
import { rolePath } from "@/lib/auth/roles";

/**
 * Parola değiştirme.
 *
 * Admin geçici parola verdiği için ilk giriş buradan geçer (`mustChangePassword`).
 * Kullanıcı sonradan da kendi isteğiyle değiştirebilir.
 *
 * Başarılı değişimde kullanıcının DİĞER tüm oturumları iptal edilir: geçici
 * parola WhatsApp/telefon üzerinden gittiği için başkasının eline geçmiş
 * olabilir — parola değişimi o erişimi kesmelidir. Değiştiren kişinin kendi
 * oturumu ayakta kalır, yoksa kendini dışarı atardı.
 */

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  if (!PANEL_ENABLED) {
    return NextResponse.json({ error: "Panel şu anda kapalı." }, { status: 503 });
  }

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Oturumunuz sona ermiş. Tekrar giriş yapın." }, { status: 401 });
  }

  const guard = await guardMutation({
    action: "auth.change_password",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `auth:change-password:${session.userId}`,
    rateLimit: { max: 10, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla deneme. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || user.status !== "ACTIVE") {
    return NextResponse.json({ error: "Oturumunuz geçersiz. Tekrar giriş yapın." }, { status: 401 });
  }

  const currentOk = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!currentOk) {
    await logAudit({
      actorUserId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "auth.change_password_failed",
      summary: "Mevcut parola hatalı",
    });
    return NextResponse.json({ error: "Mevcut parolanız hatalı." }, { status: 400 });
  }

  const strength = validatePasswordStrength(parsed.data.newPassword, {
    email: user.email,
    fullName: user.fullName,
  });
  if (!strength.ok) {
    return NextResponse.json({ error: strength.error }, { status: 400 });
  }

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return NextResponse.json(
      { error: "Yeni parola, mevcut parolanızdan farklı olmalı." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  const revoked = await revokeAllUserSessions(user.id, session.sessionId);

  await logAudit({
    actorUserId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "auth.password_changed",
    summary: `Parola değiştirildi; ${revoked} diğer oturum kapatıldı`,
  });

  return NextResponse.json({ redirect: rolePath(user.role) });
}
