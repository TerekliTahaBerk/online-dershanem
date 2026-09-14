import assert from "node:assert/strict";
import test from "node:test";

import { BUILDER_PRODUCT_REGISTRY_CODE, builderProductKeys, isKpssBuilderVisible, visibleBuilderProducts } from "./builder-products";

/** Kurucuya KPSS kartı eklenmiş olsaydı: görünürlük yalnız registry bayrağına bağlı olmalı. */
const withKpssCard = { ...BUILDER_PRODUCT_REGISTRY_CODE, kpss: "KPSS" };

test("KPSS registry'de pasifken (listActiveProducts'ta yok) kurucuda görünmez", () => {
  const activeWithoutKpss = ["OD", "OK", "ODK"];
  assert.deepEqual(visibleBuilderProducts(withKpssCard, activeWithoutKpss), ["dershanem", "kocum", "denemeKulubum"]);
});

test("aktif ürün listesi verilmezse registry ürünleri kapalı kalır (fail-closed)", () => {
  assert.deepEqual(visibleBuilderProducts(withKpssCard, []), ["dershanem", "kocum", "denemeKulubum"]);
});

test("KPSS registry'de aktif olduğunda kart tanımlıysa görünür, sıra korunur", () => {
  assert.deepEqual(visibleBuilderProducts(withKpssCard, ["KPSS"]), ["dershanem", "kocum", "denemeKulubum", "kpss"]);
});

test("legacy kartlar registry bayrağından etkilenmez", () => {
  assert.deepEqual(visibleBuilderProducts(BUILDER_PRODUCT_REGISTRY_CODE, []), ["dershanem", "kocum", "denemeKulubum"]);
});

test("gerçek kurucu konfigürasyonunda KPSS kartı yok: fiyat onayı gelmeden aktif olsa bile görünmez", () => {
  assert.equal(Object.values(BUILDER_PRODUCT_REGISTRY_CODE).includes("KPSS"), false);
  assert.deepEqual(builderProductKeys(["OD", "OK", "ODK", "KPSS"]), ["dershanem", "kocum", "denemeKulubum"]);
  assert.deepEqual(builderProductKeys(), ["dershanem", "kocum", "denemeKulubum"]);
});

test("KPSS keşif kartı registry kilidini iki yönde izler", () => {
  assert.equal(isKpssBuilderVisible(["OD", "OK", "ODK"]), false);
  assert.equal(isKpssBuilderVisible(["OD", "OK", "ODK", "KPSS"]), true);
});
