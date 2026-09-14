import assert from "node:assert/strict";
import test from "node:test";

import {
  asLegacyProductCode,
  asProductCodeEnum,
  isLegacyProductCode,
  legacyMembershipRows,
  membershipBridgeValues,
  membershipProductCode,
  sortProductCodes,
} from "./codes";

test("legacy ürün kodları tanınır, KPSS ve prototip anahtarları tanınmaz", () => {
  for (const code of ["OD", "OK", "ODK"]) assert.equal(asLegacyProductCode(code), code);
  for (const code of ["KPSS", "od", "", "toString", "__proto__"]) {
    assert.equal(asLegacyProductCode(code), null, code);
    assert.equal(isLegacyProductCode(code), false, code);
  }
});

test("KPSS enum üyesidir ama legacy değildir; enum dışı registry kodu enum sayılmaz", () => {
  for (const code of ["OD", "OK", "ODK", "KPSS"]) assert.equal(asProductCodeEnum(code), code);
  for (const code of ["ALES", "kpss", "toString", "__proto__"]) assert.equal(asProductCodeEnum(code), null, code);
});

test("üyelik kodu registry bağlantısından okunur, legacy satırda enum'a düşer", () => {
  assert.equal(membershipProductCode({ product: null, productRef: { code: "KPSS" } }), "KPSS");
  assert.equal(membershipProductCode({ product: "KPSS", productRef: { code: "KPSS" } }), "KPSS");
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

test("üyelik yazımında product ve productRefId registry satırından BİRLİKTE türetilir", () => {
  assert.deepEqual(membershipBridgeValues({ id: "p_kpss", code: "KPSS" }), { product: "KPSS", productRefId: "p_kpss" });
  assert.deepEqual(membershipBridgeValues({ id: "p_od", code: "OD" }, "OD"), { product: "OD", productRefId: "p_od" });
  // Enum dışı registry ürünü: product NULL kalır, ref zorunlu.
  assert.deepEqual(membershipBridgeValues({ id: "p_ales", code: "ALES" }), { product: null, productRefId: "p_ales" });
});

test("biri dolu diğeri boş ya da farklı ürünü gösteren köprü yazımı reddedilir", () => {
  assert.throws(() => membershipBridgeValues({ id: "", code: "KPSS" }), /PRODUCT_MEMBERSHIP_REF_MISSING:KPSS/);
  assert.throws(() => membershipBridgeValues({ id: "p_kpss", code: "KPSS" }, null), /PRODUCT_MEMBERSHIP_BRIDGE_MISMATCH:NULL:KPSS/);
  assert.throws(() => membershipBridgeValues({ id: "p_kpss", code: "KPSS" }, "OD"), /PRODUCT_MEMBERSHIP_BRIDGE_MISMATCH:OD:KPSS/);
  assert.throws(() => membershipBridgeValues({ id: "p_ales", code: "ALES" }, "ODK"), /PRODUCT_MEMBERSHIP_BRIDGE_MISMATCH:ODK:ALES/);
});

test("legacy ekran süzgeci KPSS satırını enum'da olsa bile dışarıda bırakır", () => {
  const rows = [{ product: "OD" as const }, { product: "KPSS" as const }, { product: null }, { product: "ODK" as const }];
  assert.deepEqual(legacyMembershipRows(rows).map((row) => row.product), ["OD", "ODK"]);
});

test("ürün kodları legacy enum sırası + registry alfabetik sırayla tekilleşir", () => {
  assert.deepEqual(sortProductCodes(["KPSS", "ODK", "OD", "ALES", "OD"]), ["OD", "ODK", "ALES", "KPSS"]);
});
