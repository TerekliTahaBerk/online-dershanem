import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import {
  buildInviteMessage,
  buildInviteUrl,
  issueInvitePlaceholderSecret,
  issueUserInvite,
  resolveAppOrigin,
} from "@/lib/auth/invitation";
import { hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";

/**
 * Admin davet yenileme.
 *
 * Self-servis "şifremi unuttum" YOK — e-posta göndermiyoruz. Kullanıcı arar,
 * admin buradan daveti yeniler; kullanıcı linkten kendi parolasını belirler.
 *
 * Davet yenileme o kullanıcının TÜM oturumlarını iptal eder: eski kimlik
 * materyali geçersiz kalmalıdır.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.reset_password",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:reset:${auth.session.userId}`,
    rateLimit: { max: 30, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) {
    return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  }
  if (target.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Davet yenilemeden önce hesabı aktifleştirin." },
      { status: 409 },
    );
  }

  const invite = issueUserInvite();
  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashPassword(issueInvitePlaceholderSecret()),
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
      inviteTokenHash: invite.tokenHash,
      inviteTokenExpiresAt: invite.expiresAt,
      inviteSentAt: new Date(),
      inviteAcceptedAt: null,
    },
  });

  const revoked = await revokeAllUserSessions(target.id);

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: target.id,
    action: "panel.user_invite_reset_by_admin",
    summary: `${target.email} daveti yenilendi; ${revoked} oturum kapatıldı`,
    payload: { inviteExpiresAt: invite.expiresAt.toISOString() },
  });

  const origin = resolveAppOrigin(new URL(request.url).origin);
  const inviteUrl = buildInviteUrl(origin, invite.token);
  const inviteMessage = buildInviteMessage({
    fullName: target.fullName,
    email: target.email,
    inviteUrl,
    expiresAt: invite.expiresAt,
  });

  return NextResponse.json({
    user: { id: target.id, email: target.email },
    invite: {
      url: inviteUrl,
      message: inviteMessage,
      expiresAt: invite.expiresAt.toISOString(),
    },
  });
}
