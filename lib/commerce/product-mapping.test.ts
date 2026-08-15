import assert from "node:assert/strict";
import test from "node:test";

import {
  COMMERCE_ORDER_TABLE,
  COMMERCE_TO_PRODUCT_CODE,
  MEMBERSHIP_BACKED_PRODUCTS,
  PRODUCT_ORDER_TABLE,
} from "./product-mapping";

/**
 * Bu testler bir REGRESYONU kilitler.
 *
 * Ticaret kodunda uzun süre `product === "OD" ? … : …` biçiminde ikili dallar
 * vardı. Üçüncü ürün (Online Koçum) eklendiğinde bu dallar Koçum'u sessizce
 * ODK sayıyordu: yanlış yetki açma, yanlış sipariş tablosuna yazma ve iadede
 * yanlış ürünün erişimini kapatma. Aşağıdaki testler her ürünün her akışta
 * AÇIKÇA tanımlı olmasını şart koşar.
 */

const ALL_COMMERCE = ["OD", "OK", "ODK"] as const;
const ALL_PRODUCT_CODES = ["OD", "OK", "ODK"] as const;

test("her ticaret ürünü bir yetki ürününe eşlenir ve kendine eşlenir", () => {
  for (const product of ALL_COMMERCE) {
    assert.equal(
      COMMERCE_TO_PRODUCT_CODE[product],
      product,
      `${product} yanlış yetki ürününe eşleniyor`,
    );
  }
});

test("Koçum siparişi Dershanem ile aynı tabloda, Deneme Kulübü ayrı", () => {
  assert.equal(COMMERCE_ORDER_TABLE.OD, "od");
  assert.equal(COMMERCE_ORDER_TABLE.OK, "od", "Koçum OdOrder üzerinden yürümeli");
  assert.equal(COMMERCE_ORDER_TABLE.ODK, "odk");

  // Yetki ürünüyle anahtarlanmış ikiz eşleme aynı sonucu vermeli.
  for (const product of ALL_PRODUCT_CODES) {
    assert.equal(
      PRODUCT_ORDER_TABLE[product],
      COMMERCE_ORDER_TABLE[product],
      `${product} için iki eşleme birbirinden ayrışmış`,
    );
  }
});

test("üyelik temelli ürünler yalnız OD ve OK; ODK sözleşmeyle yönetilir", () => {
  assert.equal(MEMBERSHIP_BACKED_PRODUCTS.OD, true);
  assert.equal(MEMBERSHIP_BACKED_PRODUCTS.OK, true);
  assert.equal(
    MEMBERSHIP_BACKED_PRODUCTS.ODK,
    false,
    "ODK erişimi OdkEntitlement penceresiyle yönetilir, düz üyelikle değil",
  );
});

test("hiçbir ürün eşlemede unutulmamış", () => {
  for (const product of ALL_COMMERCE) {
    assert.ok(product in COMMERCE_TO_PRODUCT_CODE, `${product} yetki eşlemesinde yok`);
    assert.ok(product in COMMERCE_ORDER_TABLE, `${product} sipariş eşlemesinde yok`);
    assert.ok(product in MEMBERSHIP_BACKED_PRODUCTS, `${product} üyelik eşlemesinde yok`);
  }
});
