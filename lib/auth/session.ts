import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import type { UserRole, UserStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Oturum yönetimi.
 *
 * Çerezde OPAK bir token taşınır; veritabanında yalnızca token'ın sha256'sı
 * saklanır. DB sızarsa oturumlar ele geçirilemez. Token'ın kendisi hiçbir
 * yerde loglanmaz.
 */

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "od_session";
const SECURE_SESSION_COOKIE = process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true;

const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

/** `lastSeenAt` her istekte yazılmaz; bu aralıktan sık güncelleme yapılmaz. */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export type SessionUser = {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string | null;
  mustChangePassword: boolean;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Yeni oturum açar ve çerezi yazar. Yalnızca route handler / server action
 * içinden çağrılabilir (render sırasında çerez yazılamaz).
 */
export async function createSession(
  userId: string,
  meta: { ip?: string | null; userAgent?: string | null } = {},
): Promise<void> {
  // 256 bit opak token — tahmin edilemez, içinde bilgi taşımaz.
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent?.slice(0, 500) ?? null,
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    // `next start` NODE_ENV=production ile yerel HTTP'de de çalışır. Secure
    // bayrağı gerçek HTTPS deployment'a göre belirlenir; WebKit aksi durumda
    // localhost çerezini reddeder.
    secure: SECURE_SESSION_COOKIE,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Çerezdeki token'dan oturumu çözer. Geçersiz/süresi geçmiş/iptal edilmiş ya da
 * kullanıcı askıya alınmışsa `null` döner.
 *
 * `cache()`: aynı istek içinde kaç kez çağrılırsa çağrılsın DB'ye bir kez gider
 * (layout + sayfa + guard hepsi çağırıyor).
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt.getTime() <= Date.now()) return null;
  // Askıya alınan kullanıcının açık oturumu ANINDA geçersizdir.
  if (session.user.status !== "ACTIVE") return null;

  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    // Kozmetik bilgi; yarışta veya hata durumunda oturumu düşürmemeli.
    await prisma.session
      .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
      .catch(() => undefined);
  }

  return {
    sessionId: session.id,
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    status: session.user.status,
    fullName: session.user.fullName,
    mustChangePassword: session.user.mustChangePassword,
  };
});

/** Tek oturumu iptal eder (çıkış). */
export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Kullanıcının TÜM oturumlarını iptal eder.
 *
 * Parola değişince, admin parola sıfırlayınca, rol değişince veya kullanıcı
 * askıya alınınca çağrılmalıdır. `exceptSessionId` ile parolasını değiştiren
 * kişinin kendi oturumu ayakta bırakılabilir.
 */
export async function revokeAllUserSessions(
  userId: string,
  exceptSessionId?: string,
): Promise<number> {
  const result = await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
  return result.count;
}

/** Çerezi siler. Oturumun kendisini iptal etmez — onu `revokeSession` yapar. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
