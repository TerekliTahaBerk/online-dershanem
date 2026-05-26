/**
 * PayTR iFrame API client + callback verification.
 *
 * Resmi doc: PayTR IFrame API (NodeJS örneği baz alındı).
 *
 * Akış (2 adım):
 *  1. Get-token: server → POST https://www.paytr.com/odeme/api/get-token
 *     ↓ token döner
 *     ↓ iframe: https://www.paytr.com/odeme/guvenli/<token>
 *  2. Callback: PayTR → POST /api/odk/paytr/callback
 *     ↓ hash doğrulanır
 *     ↓ "OK" döndürülmesi ZORUNLU (aksi halde PayTR tekrar dener)
 *
 * Tutarlar **kuruş** (cents) cinsinden gönderilir.
 * Ör: 49.90 TL → 4990
 */

import "server-only";
import crypto from "node:crypto";
import { log } from "@/lib/logger";

type PaytrConfig = {
  merchantId: string;
  merchantKey: string;
  merchantSalt: string;
};

function getConfig(): PaytrConfig | null {
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;
  if (!merchantId || !merchantKey || !merchantSalt) return null;
  return { merchantId, merchantKey, merchantSalt };
}

export function isPaytrConfigured(): boolean {
  return getConfig() !== null;
}

export type PaytrBasketItem = [name: string, price: string, quantity: number];

export type CreatePaytrTokenInput = {
  /** Sipariş benzersiz ID (32 char max, sadece alfanumerik). PayTR `merchant_oid`. */
  merchantOid: string;
  /** Müşteri e-postası. */
  email: string;
  /** Tutar kuruş cinsinden (ör. 4990 = 49.90 TL). */
  amountCents: number;
  /** Sepet kalemleri. `[ad, fiyat_str, adet]` formatında. */
  basket: PaytrBasketItem[];
  /** Müşteri IP'si (request header'dan alınır). */
  userIp: string;
  /** Müşteri adı (zorunlu — PayTR boş kabul etmez bazı setuplarda). */
  userName: string;
  /** Müşteri telefonu (zorunlu format: 05xxxxxxxxx). */
  userPhone: string;
  /** Müşteri adresi (zorunlu — boş kabul etmez). */
  userAddress: string;
  /** Başarılı dönüş URL (bilgilendirme amaçlı; onay buradan gelmez). */
  merchantOkUrl: string;
  /** Başarısız dönüş URL. */
  merchantFailUrl: string;
  /** Test modu (canlı mağazada test için 1). Varsayılan 0. */
  testMode?: "0" | "1";
  /** Tek çekim zorla (1) / taksitli izinli (0). Varsayılan 0. */
  noInstallment?: "0" | "1";
  /** Maks taksit (0 = yürürlükteki azami). */
  maxInstallment?: string;
  /** Zaman aşımı (dakika). Varsayılan 30. */
  timeoutLimit?: number;
};

export type CreatePaytrTokenResult =
  | { status: "success"; token: string; iframeUrl: string }
  | { status: "error"; reason: string };

/**
 * `merchant_oid` için güvenli string üretir (alfanumerik, max 32 char).
 * Prefix ile servis ayrımı yapılır: "ODK..." veya "OD..."
 * (Callback router merchant_oid prefix'ine göre doğru handler'a yönlendirir.)
 *
 * Implementation `lib/odk/paytr-merchant-oid.ts` içindedir (server-only değil,
 * unit-test edilebilir). Bu modül sadece re-export yapar.
 */
export {
  buildMerchantOid,
  detectPaytrService,
} from "./paytr-merchant-oid";

/**
 * Step 1 — PayTR'den iframe token alır.
 */
export async function createPaytrIframeToken(
  input: CreatePaytrTokenInput,
): Promise<CreatePaytrTokenResult> {
  const cfg = getConfig();
  if (!cfg) return { status: "error", reason: "paytr_not_configured" };

  const basketJson = JSON.stringify(input.basket);
  const userBasket = Buffer.from(basketJson, "utf8").toString("base64");

  const testMode = input.testMode ?? "0";
  const noInstallment = input.noInstallment ?? "0";
  const maxInstallment = input.maxInstallment ?? "0";
  const currency = "TL";
  const timeoutLimit = String(input.timeoutLimit ?? 30);
  const debugOn = process.env.NODE_ENV === "production" ? "0" : "1";
  const lang = "tr";

  // Token hash:
  // merchant_id + user_ip + merchant_oid + email + payment_amount + user_basket
  //   + no_installment + max_installment + currency + test_mode + merchant_salt
  // (NOT hash icinden merchant_salt; HMAC key = merchant_key)
  const hashSTR =
    cfg.merchantId +
    input.userIp +
    input.merchantOid +
    input.email +
    String(input.amountCents) +
    userBasket +
    noInstallment +
    maxInstallment +
    currency +
    testMode;

  const tokenHashInput = hashSTR + cfg.merchantSalt;
  const paytrToken = crypto
    .createHmac("sha256", cfg.merchantKey)
    .update(tokenHashInput)
    .digest("base64");

  const body = new URLSearchParams();
  body.set("merchant_id", cfg.merchantId);
  body.set("user_ip", input.userIp);
  body.set("merchant_oid", input.merchantOid);
  body.set("email", input.email);
  body.set("payment_amount", String(input.amountCents));
  body.set("paytr_token", paytrToken);
  body.set("user_basket", userBasket);
  body.set("debug_on", debugOn);
  body.set("no_installment", noInstallment);
  body.set("max_installment", maxInstallment);
  body.set("user_name", input.userName);
  body.set("user_address", input.userAddress);
  body.set("user_phone", input.userPhone);
  body.set("merchant_ok_url", input.merchantOkUrl);
  body.set("merchant_fail_url", input.merchantFailUrl);
  body.set("timeout_limit", timeoutLimit);
  body.set("currency", currency);
  body.set("test_mode", testMode);
  body.set("lang", lang);

  try {
    const res = await fetch("https://www.paytr.com/odeme/api/get-token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      // PayTR 30sn'ye kadar sürebilir; Vercel default ile uyumlu
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json()) as { status?: string; token?: string; reason?: string };
    if (json.status === "success" && json.token) {
      return {
        status: "success",
        token: json.token,
        iframeUrl: `https://www.paytr.com/odeme/guvenli/${json.token}`,
      };
    }
    log.warn("paytr.get_token_failed", { reason: json.reason, status: json.status });
    return { status: "error", reason: json.reason ?? "unknown" };
  } catch (err) {
    log.error("paytr.get_token_exception", err);
    return { status: "error", reason: "network_error" };
  }
}

export type PaytrCallbackPayload = {
  merchant_oid: string;
  status: "success" | "failed";
  total_amount: string;
  hash: string;
  failed_reason_code?: string;
  failed_reason_msg?: string;
  payment_type?: string;
  payment_amount?: string;
  currency?: string;
  installment_count?: string;
  test_mode?: string;
};

/**
 * Step 2 — PayTR callback hash doğrulaması.
 *
 * hash = base64( HMAC-SHA256( merchant_oid + merchant_salt + status + total_amount,
 *                             merchant_key ) )
 *
 * UYARI: Bu doğrulama YAPILMAZSA maddi zarar oluşabilir (PayTR doc).
 */
export function verifyPaytrCallbackHash(payload: PaytrCallbackPayload): boolean {
  const cfg = getConfig();
  if (!cfg) return false;
  const hashInput =
    payload.merchant_oid + cfg.merchantSalt + payload.status + payload.total_amount;
  const expected = crypto
    .createHmac("sha256", cfg.merchantKey)
    .update(hashInput)
    .digest("base64");
  // Sabit-zaman karşılaştırma
  if (expected.length !== payload.hash.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(payload.hash));
  } catch {
    return false;
  }
}

/**
 * X-Forwarded-For / X-Real-IP header'larından client IP çıkarır.
 * PayTR token hash'inde IP kullanılır → callback'te aynı IP olması gerekmez,
 * fakat token üretirken aynı request'in IP'sini geçirmek best practice.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = headers.get("x-real-ip");
  if (real) return real.trim();
  return "0.0.0.0";
}
