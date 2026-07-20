import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { PANEL_ENABLED } from "@/lib/panel-config";
import { normalizeEmail } from "@/lib/auth/email";
import { verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { postAuthenticationPath } from "@/lib/auth/products";

/**
 * Parola ile giriş.
 *
 * Public self-register yoktur; hesabı admin açar. Bu uç yalnızca var olan bir
 * hesabın parolasını doğrular.
 *
 * KULLANICI SAYIMINA (enumeration) KARŞI: hesap yoksa da gerçek bir scrypt
 * çalıştırılır ve yanıt "hesap yok" ile "parola yanlış" arasında ayrım yapmaz —
 * ne mesaj ne de süre farkı verir.
 */

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const loginSchema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(200),
});

/** Saldırgana giden tek mesaj. Hangi adımın hatalı olduğunu ASLA söyleme. */
const GENERIC_ERROR = "E-posta veya parola hatalı.";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  if (!PANEL_ENABLED) {
    return NextResponse.json({ error: "Panel şu anda kapalı." }, { status: 503 });
  }

  const ip = clientIp(request);

  const guard = await guardMutation({
    action: "auth.login",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `auth:login:ip:${ip}`,
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
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });

  // Hesap yok: yine de scrypt çalıştır ki cevap süresi ele vermesin.
  if (!user) {
    await verifyAgainstDummy(password);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000));
    return NextResponse.json(
      { error: `Çok fazla hatalı deneme. ${minutes} dakika sonra tekrar deneyin.` },
      { status: 423 },
    );
  }

  const passwordOk = await verifyPassword(password, user.passwordHash);

  if (!passwordOk) {
    const failedAttempts = user.failedAttempts + 1;
    const shouldLock = failedAttempts >= MAX_FAILED_ATTEMPTS;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedAttempts: shouldLock ? 0 : failedAttempts,
        lockedUntil: shouldLock ? new Date(Date.now() + LOCK_DURATION_MS) : null,
      },
    });
    await logAudit({
      actorUserId: user.id,
      entityType: "User",
      entityId: user.id,
      action: shouldLock ? "auth.login_locked" : "auth.login_failed",
      summary: shouldLock ? "Hatalı deneme sınırı aşıldı, hesap geçici kilitlendi" : "Hatalı parola",
      payload: { ip },
    });
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  /*
   * Askıya alınmış hesap kontrolü BİLEREK parola doğrulamasından SONRA.
   * Önce yapılsaydı, saldırgan parolayı bilmeden "bu hesap askıda" bilgisini
   * öğrenirdi. Parolayı bilen kişiye ise net sebebi söylemek doğru.
   */
  if (user.status !== "ACTIVE") {
    await logAudit({
      actorUserId: user.id,
      entityType: "User",
      entityId: user.id,
      action: "auth.login_suspended",
      summary: "Askıya alınmış hesapta doğru parola denemesi",
      payload: { ip },
    });
    return NextResponse.json(
      { error: "Hesabınız askıya alınmış. Lütfen ekibimizle iletişime geçin." },
      { status: 403 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  });

  await createSession(user.id, { ip, userAgent: request.headers.get("user-agent") });

  await logAudit({
    actorUserId: user.id,
    entityType: "User",
    entityId: user.id,
    action: "auth.login_success",
    summary: `Giriş: ${user.role}`,
    payload: { ip },
  });

  return NextResponse.json({
    redirect: await postAuthenticationPath({ userId: user.id, role: user.role, mustChangePassword: user.mustChangePassword }),
  });
}
