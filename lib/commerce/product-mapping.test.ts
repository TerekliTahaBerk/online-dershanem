import assert from "node:assert/strict";
import test from "node:test";
import { CommerceProduct, ProductCode } from "@prisma/client";

import {
  COMMERCE_FULFILLMENT,
  COMMERCE_ORDER_TABLE,
  COMMERCE_TO_PRODUCT_CODE,
  MEMBERSHIP_BACKED_PRODUCTS,
  ORDER_GRANTS_BUYER_OD_MEMBERSHIP,
  PRODUCT_ORDER_TABLE,
  orderGrantsBuyerOdMembership,
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

const ALL_COMMERCE = ["OD", "OK", "ODK", "KPSS"] as const;
const ALL_PRODUCT_CODES = ["OD", "OK", "ODK", "KPSS"] as const;

test("test listeleri çalışma zamanındaki Prisma enum'larıyla birebir aynı", () => {
  assert.deepEqual([...ALL_COMMERCE], Object.values(CommerceProduct));
  assert.deepEqual([...ALL_PRODUCT_CODES], Object.values(ProductCode));
});

test("her ticaret ürünü bir yetki ürününe eşlenir ve kendine eşlenir", () => {
  for (const product of ALL_COMMERCE) {
    assert.equal(
      COMMERCE_TO_PRODUCT_CODE[product],
      product,
      `${product} yanlış yetki ürününe eşleniyor`,
    );
  }
});

test("Koçum ve KPSS siparişi Dershanem ile aynı tabloda, Deneme Kulübü ayrı", () => {
  assert.equal(COMMERCE_ORDER_TABLE.OD, "od");
  assert.equal(COMMERCE_ORDER_TABLE.OK, "od", "Koçum OdOrder üzerinden yürümeli");
  assert.equal(COMMERCE_ORDER_TABLE.ODK, "odk");
  assert.equal(COMMERCE_ORDER_TABLE.KPSS, "od", "KPSS OdkOrder'a yazılamaz: OdkPackage FK'sı zorunlu");

  // Yetki ürünüyle anahtarlanmış ikiz eşleme aynı sonucu vermeli.
  for (const product of ALL_PRODUCT_CODES) {
    assert.equal(
      PRODUCT_ORDER_TABLE[product],
      COMMERCE_ORDER_TABLE[product],
      `${product} için iki eşleme birbirinden ayrışmış`,
    );
  }
});

test("üyelik temelli ürünler OD, OK ve KPSS; ODK sözleşmeyle yönetilir", () => {
  assert.equal(MEMBERSHIP_BACKED_PRODUCTS.OD, true);
  assert.equal(MEMBERSHIP_BACKED_PRODUCTS.OK, true);
  assert.equal(MEMBERSHIP_BACKED_PRODUCTS.KPSS, true, "KPSS tam iadesi KPSS üyeliğini kapatmalı");
  assert.equal(
    MEMBERSHIP_BACKED_PRODUCTS.ODK,
    false,
    "ODK erişimi OdkEntitlement penceresiyle yönetilir, düz üyelikle değil",
  );
});

test("satır stratejisi: KPSS pencereli üyelikle açılır, asla ODK sözleşmesine düşmez", () => {
  assert.deepEqual(COMMERCE_FULFILLMENT, {
    OD: "open_membership",
    OK: "open_membership",
    ODK: "odk_contract",
    KPSS: "exam_window_membership",
  });
  // Tutarlılık: sözleşme temelli olan tek ürün üyelik temelli değildir.
  for (const product of ALL_COMMERCE) {
    assert.equal(COMMERCE_FULFILLMENT[product] === "odk_contract", !MEMBERSHIP_BACKED_PRODUCTS[product], product);
  }
});

test("KPSS-only sipariş alıcıya OD üyeliği açmaz; OD/OK/ODK ve satırsız siparişte davranış aynı", () => {
  assert.equal(ORDER_GRANTS_BUYER_OD_MEMBERSHIP.KPSS, false);
  assert.equal(orderGrantsBuyerOdMembership([]), true, "satır tablosu öncesi siparişler");
  assert.equal(orderGrantsBuyerOdMembership(["OD"]), true);
  assert.equal(orderGrantsBuyerOdMembership(["OK"]), true);
  assert.equal(orderGrantsBuyerOdMembership(["ODK"]), true);
  assert.equal(orderGrantsBuyerOdMembership(["KPSS"]), false);
  assert.equal(orderGrantsBuyerOdMembership(["KPSS", "KPSS"]), false);
  assert.equal(orderGrantsBuyerOdMembership(["KPSS", "OD"]), true);
});

test("hiçbir ürün eşlemede unutulmamış", () => {
  for (const product of ALL_COMMERCE) {
    assert.ok(product in COMMERCE_TO_PRODUCT_CODE, `${product} yetki eşlemesinde yok`);
    assert.ok(product in COMMERCE_ORDER_TABLE, `${product} sipariş eşlemesinde yok`);
    assert.ok(product in MEMBERSHIP_BACKED_PRODUCTS, `${product} üyelik eşlemesinde yok`);
    assert.ok(product in COMMERCE_FULFILLMENT, `${product} satır stratejisinde yok`);
    assert.ok(product in ORDER_GRANTS_BUYER_OD_MEMBERSHIP, `${product} OD üyeliği kararında yok`);
  }
});
