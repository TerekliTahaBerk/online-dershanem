import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Tally iletişim formu entegrasyonu — saf yardımcılar (DB yok, test edilebilir).
 *
 * Akış:
 *  1. Kayıttan sonra `/kayit/iletisim-formu` Tally formunu gömer. Kullanıcıyı
 *     tanımak için URL'ye gizli alanlar eklenir; `ref` alanı
 *     `userId.HMAC(userId)` biçiminde İMZALIDIR. URL kullanıcıya açık olduğu
 *     için imzasız bir `userId`, başka birinin formunu "doldurdu" diye
 *     işaretlemeye yarardı.
 *  2. Tally webhook'u (`/api/integrations/tally`) `Tally-Signature` başlığıyla
 *     gelir: ham gövdenin signing secret ile HMAC-SHA256'sının base64'ü.
 *
 * Tally panelinde forma şu gizli alanlar (Hidden fields) AYNI ADLARLA
 * eklenmelidir: ref, name, email, phone, role, products.
 */

export const TALLY_FORM_ID = process.env.TALLY_FORM_ID?.trim() || "vGRQ5X";
export const TALLY_ORIGIN = "https://tally.so";
export const TALLY_HIDDEN_FIELDS = ["ref", "name", "email", "phone", "role", "products"] as const;

function refSecret(): string | null {
  return process.env.TALLY_REF_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || null;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function refMac(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`tally-ref:${userId}`).digest("base64url").slice(0, 32);
}

/** Kullanıcıya bağlı, değiştirilemez form referansı. Sır yoksa null (form yine açılır). */
export function signTallyRef(userId: string, secret = refSecret()): string | null {
  if (!secret) return null;
  return `${userId}.${refMac(userId, secret)}`;
}

/** İmzalı referansı doğrular; geçerliyse userId döner. */
export function verifyTallyRef(ref: string | null | undefined, secret = refSecret()): string | null {
  if (!ref || !secret || ref.length > 200) return null;
  const dot = ref.lastIndexOf(".");
  if (dot <= 0) return null;
  const userId = ref.slice(0, dot);
  const mac = ref.slice(dot + 1);
  return safeEqual(mac, refMac(userId, secret)) ? userId : null;
}

/** Webhook imzası: base64(HMAC-SHA256(rawBody, signingSecret)). */
export function verifyTallySignature(rawBody: string, header: string | null, secret = process.env.TALLY_SIGNING_SECRET?.trim()): boolean {
  if (!secret || !header) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
  return safeEqual(header.trim(), expected);
}

export type TallyEmbedContext = {
  userId: string;
  fullName: string | null;
  email: string;
  phone: string | null;
  role: string;
  products: readonly string[];
};

/** Ekran görüntüsündeki gömme kodunun URL'si + gizli alanlar. */
export function tallyEmbedUrl(context: TallyEmbedContext, formId = TALLY_FORM_ID): string {
  const url = new URL(`/r/${formId}`, TALLY_ORIGIN);
  url.searchParams.set("transparentBackground", "1");
  url.searchParams.set("formEventsForwarding", "1");
  const ref = signTallyRef(context.userId);
  if (ref) url.searchParams.set("ref", ref);
  if (context.fullName) url.searchParams.set("name", context.fullName);
  url.searchParams.set("email", context.email);
  if (context.phone) url.searchParams.set("phone", context.phone);
  url.searchParams.set("role", context.role);
  if (context.products.length) url.searchParams.set("products", context.products.join(","));
  return url.toString();
}

const fieldSchema = z
  .object({
    key: z.string().max(200).optional(),
    label: z.string().max(500).nullable().optional(),
    type: z.string().max(80).optional(),
    value: z.unknown().optional(),
  })
  .passthrough();

export const tallyWebhookSchema = z
  .object({
    eventId: z.string().min(1).max(200),
    eventType: z.string().max(80),
    createdAt: z.string().max(80).optional(),
    data: z
      .object({
        responseId: z.string().min(1).max(200),
        submissionId: z.string().max(200).optional(),
        formId: z.string().max(80).optional(),
        formName: z.string().max(300).optional(),
        fields: z.array(fieldSchema).max(500).default([]),
      })
      .passthrough(),
  })
  .passthrough();

export type TallyWebhook = z.infer<typeof tallyWebhookSchema>;

/** Gizli alanları ve ilk e-posta/telefon cevabını çıkarır. */
export function extractTallyFields(payload: TallyWebhook): {
  hidden: Record<string, string>;
  email: string | null;
  phone: string | null;
  name: string | null;
} {
  const hidden: Record<string, string> = {};
  let email: string | null = null;
  let phone: string | null = null;
  let name: string | null = null;
  for (const field of payload.data.fields) {
    const label = (field.label ?? "").trim();
    const value = typeof field.value === "string" ? field.value.trim() : typeof field.value === "number" ? String(field.value) : null;
    if (!value) continue;
    if (field.type === "HIDDEN_FIELDS" && label) {
      hidden[label] = value.slice(0, 500);
      continue;
    }
    if (!email && field.type === "INPUT_EMAIL") email = value.toLowerCase().slice(0, 254);
    if (!phone && field.type === "INPUT_PHONE_NUMBER") phone = value.slice(0, 32);
    if (!name && field.type === "INPUT_TEXT" && /ad|isim|name/i.test(label)) name = value.slice(0, 120);
  }
  return {
    hidden,
    email: email ?? hidden.email?.toLowerCase() ?? null,
    phone: phone ?? hidden.phone ?? null,
    name: name ?? hidden.name ?? null,
  };
}
