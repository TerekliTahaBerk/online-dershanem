import assert from "node:assert/strict";
import test from "node:test";

import { orderLedgerUnitForSource, orderScopeForProductFilter } from "./product-mapping";

test("sipariş defteri kaynağı açık iş birimine eşlenir", () => {
  assert.deepEqual(orderLedgerUnitForSource("ONLINE_DERSHANEM"), { product: "OD", unitName: "OnlineDershanem" });
  assert.deepEqual(orderLedgerUnitForSource("ONLINE_DENEME_KULUBU"), { product: "ODK", unitName: "OnlineDenemeKulübü" });
});

test("KPSS veya tanımsız kaynak eskiden sessizce ODK defterine düşerdi; artık hata verir", () => {
  for (const source of ["KPSS", "MANUAL", "OTHER", "toString"]) {
    assert.throws(() => orderLedgerUnitForSource(source), /UNSUPPORTED_ORDER_LEDGER_SOURCE/, source);
  }
});

test("analitik ürün filtresi sipariş tablolarını mevcut davranışla aynı daraltır", () => {
  assert.deepEqual(orderScopeForProductFilter("ALL"), { od: true, odk: true });
  assert.deepEqual(orderScopeForProductFilter("OD"), { od: true, odk: false });
  assert.deepEqual(orderScopeForProductFilter("OK"), { od: true, odk: false });
  assert.deepEqual(orderScopeForProductFilter("ODK"), { od: false, odk: true });
});

test("KPSS analitik filtresi iki tabloyu birden saymaz, hata verir", () => {
  assert.throws(() => orderScopeForProductFilter("KPSS"), /UNSUPPORTED_ANALYTICS_PRODUCT_FILTER:KPSS/);
});
