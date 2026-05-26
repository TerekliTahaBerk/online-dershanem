/**
 * OD‑PayTR callback testleri — Sprint 5 / FAZ 1.
 *
 * Çalıştırma:
 *   pnpm exec tsx scripts/test-od-paytr-callback.ts
 *
 * Kapsam:
 *  1. detectPaytrService — prefix ambiguity ("ODK..." → "ODK", "OD..." → "OD")
 *  2. buildMerchantOid   — uzunluk + prefix + alfanumerik
 *  3. Idempotency akışı dokümante (DB testi ayrı çalıştırılır — aşağıda manuel talimat)
 *
 * DB-bound testler (manuel — gerçek bir test DB'sinde çalıştırılır):
 *   - aynı merchant_oid 2x callback → tek AccountingEntry
 *   - markOdOrderRefunded 2x → tek refund entry
 *   - markOdOrderCancelled PAID üzerinde → throw
 *   - OD merchant_oid ile ODK payment.findFirst → boş döner
 */

import {
  detectPaytrService,
  buildMerchantOid,
} from "../lib/odk/paytr-merchant-oid";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function eq<T>(actual: T, expected: T, label: string): void {
  if (actual === expected) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    failures.push(label);
    console.error(`  ✗ ${label}`);
    console.error(`      expected: ${JSON.stringify(expected)}`);
    console.error(`      actual:   ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond: boolean, label: string): void {
  if (cond) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    failures.push(label);
    console.error(`  ✗ ${label}`);
  }
}

// ─── Suite 1: detectPaytrService ────────────────────────────────────────────
console.log("\n[1] detectPaytrService prefix ambiguity");
eq(detectPaytrService("ODK123abc"), "ODK", "ODK prefix → ODK");
eq(detectPaytrService("OD456xyz"), "OD", "OD prefix → OD");
eq(detectPaytrService("ODKnnnn"), "ODK", "ODK + numerik → ODK (NOT OD!)");
eq(detectPaytrService("ODabc"), "OD", "OD + harf → OD");
eq(detectPaytrService("FOO123"), "UNKNOWN", "bilinmeyen prefix → UNKNOWN");
eq(detectPaytrService(""), "UNKNOWN", "boş string → UNKNOWN");
// Kritik regression: ODK > OD sırası kesinlikle korunmalı
eq(detectPaytrService("ODK"), "ODK", "tam 'ODK' string → ODK");
eq(detectPaytrService("OD"), "OD", "tam 'OD' string → OD");

// ─── Suite 2: buildMerchantOid ──────────────────────────────────────────────
console.log("\n[2] buildMerchantOid");
{
  // Tipik cuid: cl9xyz123abc456def789  (25 char)
  const cuid = "cl9xyz123abc456def789ghij";
  const odk = buildMerchantOid(cuid, "ODK");
  const od = buildMerchantOid(cuid, "OD");
  assertTrue(odk.startsWith("ODK"), `ODK prefix korunuyor (${odk})`);
  assertTrue(od.startsWith("OD"), `OD prefix korunuyor (${od})`);
  assertTrue(odk.length <= 32, `ODK uzunluk ≤ 32 (${odk.length})`);
  assertTrue(od.length <= 32, `OD uzunluk ≤ 32 (${od.length})`);
  assertTrue(/^[A-Za-z0-9]+$/.test(odk), `ODK alfanumerik (${odk})`);
  assertTrue(/^[A-Za-z0-9]+$/.test(od), `OD alfanumerik (${od})`);
  // Round-trip: detect → aynı prefix
  eq(detectPaytrService(odk), "ODK", "ODK merchantOid → detect ODK");
  eq(detectPaytrService(od), "OD", "OD merchantOid → detect OD");
}

// Edge: özel karakterli orderId (defensive sanitization)
{
  const dirty = "cl9-abc_DEF.123";
  const oid = buildMerchantOid(dirty, "OD");
  assertTrue(/^[A-Za-z0-9]+$/.test(oid), `özel karakter strip edildi: ${oid}`);
  assertTrue(oid.startsWith("OD"), `OD prefix: ${oid}`);
}

// Edge: çok uzun orderId
{
  const long = "a".repeat(50);
  const oid = buildMerchantOid(long, "ODK");
  eq(oid.length, 32, `aşırı uzun orderId → 32 char'a budanıyor`);
  assertTrue(oid.startsWith("ODK"), `prefix budamadan korunuyor: ${oid}`);
}

// ─── Suite 3: Idempotency akış dokümantasyonu ───────────────────────────────
console.log("\n[3] Idempotency akışı (manuel DB testi):");
console.log(`
  Manuel test akışı (gerçek bir test DB'sinde):

  A) Callback replay (success):
     1. Bir PENDING OdOrder + OdPayment(provider=PAYTR) oluştur.
     2. handleOd payload'ını 2x POST et.
     3. Beklenen:
        - OdOrder.status === "PAID" (tek geçiş)
        - AccountingEntry where refType="OdOrder", refId=orderId → COUNT === 1
        - Notification user'a 1 kez (expireRelatedNotifications dedup)
        - 200 OK her iki çağrıda

  B) Refund idempotency:
     1. PAID bir sipariş için markOdOrderRefunded(orderId) çağır → AccountingEntry yazılır.
     2. Aynı çağrıyı tekrar yap → throw olmaz, yeni entry yazılmaz.
     3. Beklenen:
        - OdOrder.status === "REFUNDED"
        - AccountingEntry where refType="OdOrderRefund", refId=orderId → COUNT === 1
        - OdPayment.status === "REFUNDED"

  C) Cancel only-from-PENDING:
     1. PAID bir sipariş üzerinde markOdOrderCancelled → THROW
        ("Sadece PENDING siparişler iptal edilebilir...")

  D) Service isolation:
     1. handleOd merchant_oid "ODxxx" geldiğinde:
        - prisma.odkPayment.findFirst({where:{providerRef:"ODxxx"}}) === null
        - prisma.odPayment.findFirst({where:{providerRef:"ODxxx"}}) === found
     2. Tersi de doğru olmalı (ODK prefix → odPayment.findFirst null).
`);

// ─── Sonuç ──────────────────────────────────────────────────────────────────
console.log("\n────────────────────────────────────────");
console.log(`  ${pass} pass, ${fail} fail`);
if (fail > 0) {
  console.log("\n  Başarısız:");
  for (const f of failures) console.log(`    - ${f}`);
  process.exit(1);
}
console.log("  ✓ Tüm pure-function testleri geçti.");
console.log("  → DB integration testleri için yukarıdaki manuel adımları izleyin.");
