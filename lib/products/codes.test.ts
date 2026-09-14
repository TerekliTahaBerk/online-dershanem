import assert from "node:assert/strict";
import test from "node:test";

import { asLegacyProductCode, isLegacyProductCode, membershipProductCode, sortProductCodes } from "./codes";

test("legacy ürün kodları tanınır, KPSS ve prototip anahtarları tanınmaz", () => {
  for (const code of ["OD", "OK", "ODK"]) assert.equal(asLegacyProductCode(code), code);
  for (const code of ["KPSS", "od", "", "toString", "__proto__"]) {
    assert.equal(asLegacyProductCode(code), null, code);
    assert.equal(isLegacyProductCode(code), false, code);
  }
});

test("üyelik kodu registry bağlantısından okunur, legacy satırda enum'a düşer", () => {
  assert.equal(membershipProductCode({ product: null, productRef: { code: "KPSS" } }), "KPSS");
  assert.equal(membershipProductCode({ product: "OD", productRef: null }), "OD");
  assert.equal(membershipProductCode({ product: "OD", productRef: { code: "OD" } }), "OD");
});

test("köprüsü bozuk üyelik satırı sessizce yok sayılmaz, hata verir", () => {
  assert.throws(() => membershipProductCode({ product: null, productRef: null }), /PRODUCT_MEMBERSHIP_WITHOUT_PRODUCT/);
  assert.throws(
    () => membershipProductCode({ product: "OD", productRef: { code: "KPSS" } }),
    /PRODUCT_MEMBERSHIP_BRIDGE_MISMATCH/,
  );
});

test("ürün kodları legacy enum sırası + registry alfabetik sırayla tekilleşir", () => {
  assert.deepEqual(sortProductCodes(["KPSS", "ODK", "OD", "ALES", "OD"]), ["OD", "ODK", "ALES", "KPSS"]);
});
