import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../../../lib/prisma";

/**
 * OD-012 — panel alanı için gerçek Postgres entegrasyon katmanı.
 *
 * NEDEN AYRI BİR KATMAN: unit testler saf kuralları, E2E ise tarayıcı
 * yolculuklarını doğruluyor. Aradaki en pahalı hata sınıfı — *yetki kapsamı +
 * transaction + gerçek veritabanı kısıtı* birleşimi — ikisinin de dışında
 * kalıyordu. Burada yalnız o kesişim test edilir; her şey entegrasyon testi
 * yapılmaz.
 *
 * NE TEST EDİLMEZ: HTTP route handler'ları. `cookies()`/`headers()` Next'in
 * istek deposunu (`work-unit-async-storage`) gerektiriyor; sahtesini kurmak
 * Next'in iç API'sine sıkı bağlanır ve her sürümde kırılır. Route'ların kimlik
 * doğrulama yüzeyi E2E'de, kapsam/kısıt sözleşmesi ise burada — çağırdıkları
 * sunucu modülleri üzerinden — doğrulanır.
 */

const enabled = process.env.PANEL_INTEGRATION_TEST === "true";

/** Gerçek Postgres gerektiren test. Bayrak kapalıysa atlanır, kırmızı yanmaz. */
export const integration = (name: string, fn: () => Promise<void>) =>
  test(name, { skip: !enabled ? "PANEL_INTEGRATION_TEST=true değil" : false }, fn);

export { prisma };

/** Her koşuda benzersiz — testler aynı veritabanını paylaşabilsin diye. */
export const runId = crypto.randomUUID().slice(0, 8);

/**
 * `notFound()` gerçek bir HTTP yanıtı değil, digest taşıyan bir throw'dur.
 * Kapsam dışı kimliklerin 404 ürettiğini bu digest üzerinden doğruluyoruz.
 */
export const NOT_FOUND_DIGEST = "NEXT_HTTP_ERROR_FALLBACK;404";

export async function assertNotFound(fn: () => Promise<unknown>, message?: string) {
  await assert.rejects(
    fn,
    (error: unknown) => (error as { digest?: string }).digest === NOT_FOUND_DIGEST,
    message,
  );
}

/** Prisma'nın benzersiz kısıt ihlali. */
export async function assertUniqueViolation(fn: () => Promise<unknown>, message?: string) {
  await assert.rejects(
    fn,
    (error: unknown) => (error as { code?: string }).code === "P2002",
    message,
  );
}
