import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { passwordResetTokenId } from "@/lib/auth/password-reset";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { getRateLimitKeyFromIp } from "@/lib/security/rate-limit";

const schema = z.object({
  token: z.string().min(20).max(200),
  newPassword: z.string().min(1).max(200),
});
const INVALID_LINK = "Bu parola yenileme bağlantısı geçersiz, kullanılmış veya süresi dolmuş.";

export async function POST(request: Request) {
  if (!PANEL_ENABLED) return NextResponse.json({ error: "Panel şu anda kapalı." }, { status: 503 });

  const guard = await guardMutation({
    action: "auth.reset_password",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: getRateLimitKeyFromIp(request.headers, "auth.reset-password"),
    rateLimit: { max: 10, windowMs: 15 * 60_000, message: "Çok fazla deneme. Biraz sonra tekrar deneyin." },
  });
  if (!guard.ok) return mutationGuardResponse(guard);

  let body: unknown;
  try { body = await request.json(); } catch { body = null; }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: INVALID_LINK }, { status: 400 });

  const { token, newPassword } = parsed.data;
  const tokenId = passwordResetTokenId(token);
  const reset = tokenId
    ? await prisma.passwordResetToken.findUnique({ where: { id: tokenId }, include: { user: true } })
    : null;
  const tokenMatches = reset ? await verifyPassword(token, reset.tokenHash) : false;

  const now = new Date();
  if (!reset || !tokenMatches || reset.usedAt || reset.expiresAt <= now || reset.user.status !== "ACTIVE") {
    return NextResponse.json({ error: INVALID_LINK }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const strength = validatePasswordStrength(newPassword, { email: reset.user.email, fullName: reset.user.fullName });
  if (!strength.ok) return NextResponse.json({ error: strength.error }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, tokenHash: reset.tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) return null;

    await tx.user.update({
      where: { id: reset.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
        failedAttempts: 0,
        lockedUntil: null,
        inviteAcceptedAt: new Date(),
        passwordChangedAt: new Date(),
      },
    });
    const revoked = await tx.session.updateMany({
      where: { userId: reset.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { revoked: revoked.count };
  });

  if (!result) return NextResponse.json({ error: INVALID_LINK }, { status: 409 });

  await logAudit({
    actorUserId: reset.userId,
    entityType: "User",
    entityId: reset.userId,
    action: "auth.password_reset_self_service",
    summary: `Parola self servis yenilendi; ${result.revoked} oturum kapatıldı`,
  });

  return NextResponse.json({ redirect: "/giris?password-reset=success" }, { headers: { "Cache-Control": "no-store" } });
}
