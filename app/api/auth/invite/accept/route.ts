import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getClientIp, getRateLimitKeyFromIp } from "@/lib/security/rate-limit";
import { hashInviteToken } from "@/lib/auth/invitation";
import { hashPassword } from "@/lib/auth/password";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { createSession, revokeAllUserSessions } from "@/lib/auth/session";
import { postAuthenticationPath } from "@/lib/auth/products";
import { PANEL_ENABLED } from "@/lib/panel-config";

const schema = z.object({
  token: z.string().min(20).max(300),
  newPassword: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  if (!PANEL_ENABLED) {
    return NextResponse.json({ error: "Panel şu anda kapalı." }, { status: 503 });
  }

  const ip = getClientIp(request.headers);
  const guard = await guardMutation({
    action: "auth.invite_accept",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: getRateLimitKeyFromIp(request.headers, "auth.invite_accept"),
    rateLimit: { max: 20, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla deneme. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Davet bağlantısı veya parola geçersiz." }, { status: 400 });
  }

  const tokenHash = hashInviteToken(parsed.data.token);
  const now = new Date();
  const user = await prisma.user.findFirst({
    where: {
      inviteTokenHash: tokenHash,
      inviteAcceptedAt: null,
      inviteTokenExpiresAt: { gt: now },
      status: "ACTIVE",
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Davet bağlantısı geçersiz veya süresi dolmuş." }, { status: 400 });
  }

  const strength = validatePasswordStrength(parsed.data.newPassword, {
    email: user.email,
    fullName: user.fullName,
  });
  if (!strength.ok) {
    return NextResponse.json({ error: strength.error }, { status: 400 });
  }

  const updated = await prisma.user.updateMany({
    where: {
      id: user.id,
      inviteTokenHash: tokenHash,
      inviteAcceptedAt: null,
      inviteTokenExpiresAt: { gt: now },
      status: "ACTIVE",
    },
    data: {
      passwordHash: await hashPassword(parsed.data.newPassword),
      mustChangePassword: false,
      failedAttempts: 0,
      lockedUntil: null,
      passwordChangedAt: now,
      inviteAcceptedAt: now,
      inviteTokenHash: null,
      inviteTokenExpiresAt: null,
    },
  });

  if (updated.count !== 1) {
    return NextResponse.json({ error: "Davet bağlantısı daha önce kullanılmış." }, { status: 409 });
  }

  await revokeAllUserSessions(user.id);
  const { token } = await createSession(user.id, user.role, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  await logAudit({
    actorUserId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "auth.invite_accepted",
    summary: "Davet bağlantısı ile ilk giriş tamamlandı",
    payload: { ip },
  });

  const isMobileClient = request.headers.get("x-od-client") === "mobile";
  return NextResponse.json({
    redirect: await postAuthenticationPath({
      userId: user.id,
      role: user.role,
      mustChangePassword: false,
    }),
    ...(isMobileClient ? { token } : {}),
  });
}
