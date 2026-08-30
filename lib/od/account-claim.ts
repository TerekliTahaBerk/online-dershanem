import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { hashPassword } from "@/lib/auth/password";

/**
 * HESAP DEVRALMA DAVETİ — saf kurallar.
 *
 * Ödeme sonrası hesap otomatik açılır ama sahibi parolasını bilmez. Davet, o
 * hesabı sahibinin devralmasını sağlar; operasyondaki "geçici parolayı elden
 * ilet" adımı böylece ortadan kalkar.
 *
 * GİZLİLİK MODELİ `password-reset.ts` ile AYNIDIR ve bilerek kopyalanmamıştır
 * — ayrı bir dosyada durmasının sebebi ömür ve anlam farkı:
 *   · parola sıfırlama 60 dakika yaşar, kullanıcı ister, sessizce ölür;
 *   · davet günlerce yaşar, sistem üretir, hatırlatılır ve süresi dolarsa
 *     operasyon istisnası doğurur.
 * İkisini tek modele sıkıştırmak, TTL ve hatırlatma kurallarını birbirine
 * karıştırırdı.
 *
 * Token biçimi: `<id>.<hmac>`. Veritabanında yalnız tam token'ın scrypt
 * doğrulayıcısı durur; outbox'a yazılan HTML gizli değeri değil yalnız `id`
 * işaretini taşır, böylece bir veritabanı/outbox dökümü kullanılabilir davet
 * içermez.
 */

/** Davet 14 gün yaşar: bir satın alma sonrası tatil/sınav haftasını kapsar. */
export const ACCOUNT_CLAIM_TTL_MS = 14 * 24 * 60 * 60_000;

/** İlk hatırlatma 3. günde, ikincisi 8. günde; en fazla iki hatırlatma. */
export const ACCOUNT_CLAIM_REMINDER_STEPS_MS = [3 * 24 * 60 * 60_000, 8 * 24 * 60 * 60_000] as const;
export const ACCOUNT_CLAIM_MAX_REMINDERS = ACCOUNT_CLAIM_REMINDER_STEPS_MS.length;

const TOKEN_ID_BYTES = 18;
const TOKEN_MARKER = /\{\{ACCOUNT_CLAIM_URL:([A-Za-z0-9_-]{24})\}\}/g;

export const ACCOUNT_CLAIM_PATH = "/hesap-kur";

function claimSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  if (!secret) throw new Error("NEXTAUTH_SECRET is required for account claim tokens");
  return secret;
}

function proofForId(id: string): string {
  // Alan adı ("account-claim") parola sıfırlama kanıtından FARKLIDIR: aynı
  // gizli anahtarla üretilen iki token birbirinin yerine kullanılamaz.
  return createHmac("sha256", claimSecret()).update(`account-claim:${id}`).digest("base64url");
}

export async function createAccountClaimToken(): Promise<{ id: string; token: string; tokenHash: string }> {
  const id = randomBytes(TOKEN_ID_BYTES).toString("base64url");
  const token = `${id}.${proofForId(id)}`;
  return { id, token, tokenHash: await hashPassword(token) };
}

/** Biçim ve HMAC kanıtı doğruysa davet kimliği; aksi hâlde `null`. */
export function accountClaimTokenId(token: string): string | null {
  const [id, proof, extra] = token.split(".");
  if (extra !== undefined || !id || !proof || !/^[A-Za-z0-9_-]{24}$/.test(id)) return null;
  const expected = proofForId(id);
  const actualBuffer = Buffer.from(proof);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  return id;
}

export function accountClaimUrlMarker(id: string): string {
  return `{{ACCOUNT_CLAIM_URL:${id}}}`;
}

/** Davet URL'ini yalnız bellekte, Resend'e teslimden hemen önce oluşturur. */
export function materializeAccountClaimEmailHtml(html: string): string {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://www.onlinedershanem.com").replace(/\/$/, "");
  return html.replace(TOKEN_MARKER, (_marker, id: string) => {
    // Fragment HTTP erişim loglarına ve Referer başlığına düşmez; istemci
    // okuyup gizli değeri yalnız POST gövdesinde gönderir.
    return `${baseUrl}${ACCOUNT_CLAIM_PATH}#token=${encodeURIComponent(`${id}.${proofForId(id)}`)}`;
  });
}

export type AccountClaimRejection =
  | "TOKEN_INVALID"
  | "NOT_FOUND"
  | "ALREADY_CLAIMED"
  | "SUPERSEDED"
  | "EXPIRED"
  | "ACCOUNT_UNAVAILABLE";

export const ACCOUNT_CLAIM_REJECTION_MESSAGES: Record<AccountClaimRejection, string> = {
  TOKEN_INVALID: "Bu davet bağlantısı geçerli değil. E-postadaki bağlantıyı tam olarak kopyalayın.",
  NOT_FOUND: "Bu davet bulunamadı. Yeni bir davet için bizimle iletişime geçin.",
  ALREADY_CLAIMED: "Bu hesap zaten kuruldu. Giriş yapabilir, parolanızı unuttuysanız yenileyebilirsiniz.",
  SUPERSEDED: "Bu davetin yerine daha yenisi gönderildi. Son e-postadaki bağlantıyı kullanın.",
  EXPIRED: "Davetin süresi doldu. Ekibimiz yeni bir davet gönderecek.",
  ACCOUNT_UNAVAILABLE: "Bu hesap şu anda kullanılamıyor. Bizimle iletişime geçin.",
};

/**
 * Bir davet kaydının O ANDA kullanılabilir olup olmadığı.
 *
 * Süre dolumu SAAT ile belirlenir, `status` sütunuyla değil: cron gecikse bile
 * süresi geçmiş bir davet kabul edilmez. `status` yalnız kalıcı sonucu tutar.
 */
export function accountClaimRejection(
  claim: { status: "PENDING" | "CLAIMED" | "EXPIRED" | "SUPERSEDED"; expiresAt: Date } | null,
  user: { status: "ACTIVE" | "SUSPENDED" } | null,
  now = new Date(),
): AccountClaimRejection | null {
  if (!claim) return "NOT_FOUND";
  if (claim.status === "CLAIMED") return "ALREADY_CLAIMED";
  if (claim.status === "SUPERSEDED") return "SUPERSEDED";
  if (claim.status === "EXPIRED" || claim.expiresAt <= now) return "EXPIRED";
  if (!user || user.status !== "ACTIVE") return "ACCOUNT_UNAVAILABLE";
  return null;
}

/**
 * Bu davet için hatırlatma zamanı geldi mi?
 *
 * Basamaklar davetin OLUŞTURULMA anına göre sabittir; "son hatırlatmadan N gün
 * sonra" demek, gecikmiş bir cron koşusunda hatırlatmaları üst üste yığardı.
 */
export function accountClaimReminderDue(
  claim: { createdAt: Date; reminderCount: number; status: string; expiresAt: Date },
  now = new Date(),
): boolean {
  if (claim.status !== "PENDING" || claim.expiresAt <= now) return false;
  if (claim.reminderCount >= ACCOUNT_CLAIM_MAX_REMINDERS) return false;
  const step = ACCOUNT_CLAIM_REMINDER_STEPS_MS[claim.reminderCount];
  return now.getTime() - claim.createdAt.getTime() >= step;
}
