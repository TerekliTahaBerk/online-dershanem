import assert from "node:assert/strict";
import test from "node:test";

import { odCheckoutInputSchema } from "./checkout-request";
import { OD_NO_SLOT_VALUES, OD_TIME_RANGE_VALUES } from "./placement";

function checkoutInput(service: string) {
  return {
    fullName: "Test Alıcı",
    email: "alici@example.com",
    phone: "05550000000",
    city: "İstanbul",
    district: "Kadıköy",
    classLevel: "Mezun",
    availabilityTimeRanges: [OD_TIME_RANGE_VALUES[0]],
    noSlotPreference: OD_NO_SLOT_VALUES[0],
    items: [{ service, id: "sku-1", name: "Paket", category: "KPSS", subject: "Paket", priceCents: 100_000, qty: 1 }],
  };
}

test("checkout sepeti OD ve ODK satırlarını kabul eder", () => {
  for (const service of ["OD", "ODK"]) {
    assert.equal(odCheckoutInputSchema.safeParse(checkoutInput(service)).success, true, service);
  }
});

/**
 * KPSS SATIŞ KİLİDİ: enum'da `CommerceProduct.KPSS` olsa da public checkout
 * KPSS satırı oluşturamaz. Açmak onaylı fiyat/paket kararı ve bilinçli bir
 * şema değişikliği gerektirir (KPSS Görev 5, Adım 3).
 */
test("checkout sepeti KPSS satırını reddeder", () => {
  const result = odCheckoutInputSchema.safeParse(checkoutInput("KPSS"));
  assert.equal(result.success, false);
  assert.deepEqual(result.error?.issues[0]?.path, ["items", 0, "service"]);
});
