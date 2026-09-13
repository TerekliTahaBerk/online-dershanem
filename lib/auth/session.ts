import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { UserRole, UserStatus } from "@prisma/client";
import { withPrismaResilience } from "@/lib/prisma-resilience";
import { SESSION_POLICIES, absoluteSessionExpiry, sessionExpiryReason } from "@/lib/auth/session-policy";
import { parseBearerToken } from "@/lib/auth/bearer-token";

/**
 * Oturum yönetimi.
 *
 * Çerezde OPAK bir token taşınır; veritabanında yalnızca token'ın sha256'sı
 * saklanır. DB sızarsa oturumlar ele geçirilemez. Token'ın kendisi hiçbir
 * yerde loglanmaz.
 */

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "od_session";
const SECURE_SESSION_COOKIE = process.env.VERCEL_ENV === "production" || process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true;

export type SessionUser = {
  sessionId: string;
  userId: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  fullName: string | null;
  mustChangePassword: boolean;
  mfaVerifiedAt: Date | null;
  stepUpAt: Date | null;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Çerezi bulamazsa mobil istemciler için `Authorization: Bearer` header'ına
 * bakar. Route handler'larda `next/headers`'ın `headers()`'ı isteğin gerçek
 * header'larını verir — imza değişmediği için tüm çağıranlar (guards.ts,
 * api-guards.ts, sayfalar) dokunulmadan bu yoldan da faydalanır.
 */
async function resolveToken(): Promise<string | null> {
  const store = await cookies();
  const cookieToken = store.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const h = await headers();
  return parseBearerToken(h.get("authorization"));
}

/**
 * Yeni oturum açar ve çerezi yazar. Yalnızca route handler / server action
 * içinden çağrılabilir (render sırasında çerez yazılamaz). Ham token'ı da
 * döner — mobil giriş uç noktası bunu yanıt gövdesine koyup `SecureStore`'a
 * kaydettirir; web akışı yalnızca çerezi kullanmaya devam eder.
 */
export async function createSession(
  userId: string,
  role: UserRole,
  meta: { ip?: string | null; userAgent?: string | null; mfaVerified?: boolean } = {},
): Promise<{ token: string; expiresAt: Date }> {
  // 256 bit opak token — tahmin edilemez, içinde bilgi taşımaz.
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_POLICIES[role].absoluteTtlMs);

  await withPrismaResilience((db) =>
    db.session.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent?.slice(0, 500) ?? null,
        ...(meta.mfaVerified ? { mfaVerifiedAt: now, stepUpAt: now } : {}),
      },
    }),
  );

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

  return { token, expiresAt };
}

/**
 * Çerez ya da `Authorization: Bearer` token'ından oturumu çözer.
 * Geçersiz/süresi geçmiş/iptal edilmiş ya da kullanıcı askıya alınmışsa
 * `null` döner.
 *
 * `cache()`: aynı istek içinde kaç kez çağrılırsa çağrılsın DB'ye bir kez gider
 * (layout + sayfa + guard hepsi çağırıyor).
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const token = await resolveToken();
  if (!token) return null;

  const session = await withPrismaResilience((db) =>
    db.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    }),
  );

  if (!session) return null;
  if (session.revokedAt) return null;
  // Askıya alınan kullanıcının açık oturumu ANINDA geçersizdir.
  if (session.user.status !== "ACTIVE") return null;

  const now = new Date();
  const role = session.user.role;
  const expiryReason = sessionExpiryReason({ role, createdAt: session.createdAt, expiresAt: session.expiresAt, lastSeenAt: session.lastSeenAt }, now);
  if (expiryReason) {
    await withPrismaResilience((db) =>
      db.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { revokedAt: now } }),
    );
    return null;
  }

  // The conditional update is the authoritative idle-time check and activity
  // write in one DB operation. A stale concurrent request cannot resurrect a
  // session that crossed either boundary or whose user role/status changed.
  const policy = SESSION_POLICIES[role];
  const touched = await withPrismaResilience((db) =>
    db.session.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: now },
        createdAt: { gt: new Date(now.getTime() - policy.absoluteTtlMs) },
        lastSeenAt: { gt: new Date(now.getTime() - policy.idleTimeoutMs) },
        user: { status: "ACTIVE", role },
      },
      data: { lastSeenAt: now },
    }),
  );
  if (touched.count !== 1) return null;

  return {
    sessionId: session.id,
    userId: session.user.id,
    email: session.user.email,
    role: session.user.role,
    status: session.user.status,
    fullName: session.user.fullName,
    mustChangePassword: session.user.mustChangePassword,
    mfaVerifiedAt: session.mfaVerifiedAt,
    stepUpAt: session.stepUpAt,
  };
});

/** Tek oturumu iptal eder (çıkış). */
export async function revokeSession(sessionId: string): Promise<void> {
  await withPrismaResilience((db) =>
    db.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  );
}

export type ActiveSession = {
  id: string;
  createdAt: Date;
  lastSeenAt: Date;
  expiresAt: Date;
  userAgent: string | null;
  ip: string | null;
};

export async function listActiveUserSessions(userId: string, role: UserRole, now = new Date()): Promise<ActiveSession[]> {
  const sessions = await withPrismaResilience((db) =>
    db.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: now } },
      select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, userAgent: true, ip: true },
      orderBy: { lastSeenAt: "desc" },
    }),
  );
  return sessions
    .filter((session) => !sessionExpiryReason({ ...session, role }, now))
    .map((session) => ({ ...session, expiresAt: absoluteSessionExpiry(role, session.createdAt, session.expiresAt) }));
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
  const result = await withPrismaResilience((db) =>
    db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    }),
  );
  return result.count;
}

/** Çerezi siler. Oturumun kendisini iptal etmez — onu `revokeSession` yapar. */
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}
