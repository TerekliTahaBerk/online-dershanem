import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRole } from "@/lib/auth/api-guards";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";
import { revokeAllUserSessions } from "@/lib/auth/session";

/**
 * Admin parola sıfırlama.
 *
 * Self-servis "şifremi unuttum" YOK — e-posta göndermiyoruz. Kullanıcı arar,
 * admin buradan sıfırlar, yeni geçici parolayı elden iletir.
 *
 * Sıfırlama o kullanıcının TÜM oturumlarını iptal eder: parola sıfırlamanın
 * sebebi genelde "erişim kaybı veya şüphe"dir; eski oturumu ayakta bırakmak
 * sıfırlamayı anlamsız kılardı.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
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

  const tempPassword = generateTemporaryPassword();
  await prisma.user.update({
    where: { id: target.id },
    data: {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      failedAttempts: 0,
      lockedUntil: null,
    },
  });

  const revoked = await revokeAllUserSessions(target.id);

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: target.id,
    action: "panel.password_reset_by_admin",
    summary: `${target.email} parolası sıfırlandı; ${revoked} oturum kapatıldı`,
  });

  return NextResponse.json({
    user: { id: target.id, email: target.email },
    tempPassword,
  });
}
