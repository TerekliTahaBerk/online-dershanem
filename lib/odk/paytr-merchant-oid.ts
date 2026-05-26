/**
 * Pure helpers for PayTR merchant_oid handling.
 *
 * Bu modül **server-only DEĞİL** — test edilebilir olması için ayrılmıştır.
 * `lib/odk/paytr.ts` bu fonksiyonları re-export eder.
 */

/**
 * `merchant_oid` için güvenli string üretir (alfanumerik, max 32 char).
 * Prefix ile servis ayrımı yapılır: "ODK..." veya "OD..."
 */
export function buildMerchantOid(orderId: string, prefix: "ODK" | "OD" = "ODK"): string {
  const safe = orderId.replace(/[^a-zA-Z0-9]/g, "");
  return `${prefix}${safe}`.slice(0, 32);
}

/**
 * merchant_oid prefix'inden servisi tespit eder.
 *
 * KRİTİK: "ODK" kontrolü "OD"den ÖNCE yapılmalı; aksi halde "ODK..." → "OD"
 * yakalanır ve yanlış handler'a düşer. Bu sıra **regression test** ile
 * korunmalı (`scripts/test-od-paytr-callback.ts`).
 */
export function detectPaytrService(merchantOid: string): "ODK" | "OD" | "UNKNOWN" {
  if (merchantOid.startsWith("ODK")) return "ODK";
  if (merchantOid.startsWith("OD")) return "OD";
  return "UNKNOWN";
}
