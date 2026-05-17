/**
 * Login brute-force koruması (schema değişmeden).
 *
 * Mevcut `RateLimitEntry` tablosunu kullanır — failed login her denemede
 * `login:fail:<email>` key'i ile sayılır. Belirli pencerede limit aşılırsa
 * `isLockedOut` true döner ve authorize fonksiyonu reddeder.
 *
 * Politika: 5 başarısız deneme / 15 dakika = 15 dakikalık lockout.
 *
 * Başarılı login `clearFailedAttempts` ile sayacı sıfırlayabilir (ama
 * RateLimitEntry'de gerçek silme yok — pencere kayan, eski entry'ler doğal
 * eskir; bu yüzden clear sadece "next windowMs için boş başlat" anlamında
 * yok-değer. Mevcut yapıyla yeterli.)
 */
import "server-only";
import { prisma } from "@/lib/prisma";

const FAIL_LIMIT = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15dk

// IP-based defense layer (credential stuffing — dağıtık değilse)
const IP_FAIL_LIMIT = 20;
const IP_WINDOW_MS = 60 * 60 * 1000; // 1 saat

function failKey(email: string): string {
  return `login:fail:${email.toLowerCase().trim()}`;
}

function ipKey(ip: string): string {
  return `login:ip:${ip}`;
}

export function extractClientIp(headers: Headers | Record<string, string | string[] | undefined>): string {
  const get = (k: string): string | undefined => {
    if (headers instanceof Headers) return headers.get(k) ?? undefined;
    const v = headers[k] ?? headers[k.toLowerCase()];
    if (Array.isArray(v)) return v[0];
    return v;
  };
  const xff = get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return get("x-real-ip") || "unknown";
}

/**
 * IP-based lockout — dağıtık olmayan credential-stuffing'e karşı.
 */
export async function isIpLockedOut(ip: string): Promise<boolean> {
  if (!ip || ip === "unknown") return false;
  const since = new Date(Date.now() - IP_WINDOW_MS);
  const fails = await prisma.rateLimitEntry.count({
    where: { key: ipKey(ip), createdAt: { gte: since } },
  });
  return fails >= IP_FAIL_LIMIT;
}

export async function recordIpFailedAttempt(ip: string): Promise<void> {
  if (!ip || ip === "unknown") return;
  await prisma.rateLimitEntry.create({ data: { key: ipKey(ip) } }).catch(() => undefined);
}

/**
 * Kullanıcı şu an lock'lı mı? (sayım bazlı; sliding window)
 */
export async function isLockedOut(email: string): Promise<boolean> {
  if (!email) return false;
  const since = new Date(Date.now() - WINDOW_MS);
  const fails = await prisma.rateLimitEntry.count({
    where: { key: failKey(email), createdAt: { gte: since } },
  });
  return fails >= FAIL_LIMIT;
}

/**
 * Başarısız denemeyi kaydet (sliding window içinde).
 * `remainingAttempts` döndür — UI veya log için.
 */
export async function recordFailedAttempt(email: string): Promise<{ remaining: number; lockedNow: boolean }> {
  if (!email) return { remaining: FAIL_LIMIT, lockedNow: false };
  await prisma.rateLimitEntry.create({ data: { key: failKey(email) } }).catch(() => undefined);
  const since = new Date(Date.now() - WINDOW_MS);
  const count = await prisma.rateLimitEntry.count({
    where: { key: failKey(email), createdAt: { gte: since } },
  });
  return { remaining: Math.max(0, FAIL_LIMIT - count), lockedNow: count >= FAIL_LIMIT };
}

/**
 * Eski entry'leri temizleyici (cron'dan günde 1 çağrılır — opsiyonel).
 * 24 saatten eski tüm login:fail kayıtlarını siler.
 */
export async function pruneOldFailedAttempts(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const res = await prisma.rateLimitEntry.deleteMany({
    where: {
      OR: [
        { key: { startsWith: "login:fail:" } },
        { key: { startsWith: "login:ip:" } },
      ],
      createdAt: { lt: cutoff },
    },
  });
  return res.count;
}
