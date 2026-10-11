import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  FALLBACK_PUBLIC_PRODUCT_CODES,
  isPublicProductVisible,
  visiblePublicProducts,
} from "./public-marketing-products";

const legacyCodes = ["OD", "OK", "ODK"];

test("KPSS pasifken public yüzeylerde yalnız mevcut üç ürün kalır", () => {
  const products = visiblePublicProducts(legacyCodes);
  assert.deepEqual(
    products.map((product) => product.registryCode),
    legacyCodes,
  );
  assert.equal(products.some((product) => product.href === "/urunler/kpss"), false);
});

test("KPSS aktif edildiğinde public yüzeylerde tanım sırasıyla görünür", () => {
  const products = visiblePublicProducts([...legacyCodes, "KPSS"]);
  assert.deepEqual(
    products.map((product) => product.registryCode),
    [...legacyCodes, "KPSS"],
  );
  assert.equal(isPublicProductVisible("KPSS", [...legacyCodes, "KPSS"]), true);
});

test("ana sayfa ürün DOM'u KPSS kilidini false/true durumlarında izler", async () => {
  // The Node runner has no Next.js CSS transformer; this test checks product visibility.
  const require = createRequire(`${process.cwd()}/package.json`);
  const previousCssLoader = require.extensions[".css"];
  require.extensions[".css"] = (module) => { module.exports = {}; };
  let ProductTrioView: typeof import("@/components/home/product-trio-view").ProductTrioView;
  try {
    ({ ProductTrioView } = await import("@/components/home/product-trio-view"));
  } finally {
    if (previousCssLoader) require.extensions[".css"] = previousCssLoader;
    else delete require.extensions[".css"];
  }
  const inactiveHtml = renderToStaticMarkup(
    createElement(ProductTrioView, {
      products: visiblePublicProducts(legacyCodes),
    }),
  );
  const activeHtml = renderToStaticMarkup(
    createElement(ProductTrioView, {
      products: visiblePublicProducts([...legacyCodes, "KPSS"]),
    }),
  );

  assert.equal(inactiveHtml.includes("/urunler/kpss"), false);
  assert.equal(inactiveHtml.includes("Sınav gününe kadar planın net olsun."), false);
  assert.equal(activeHtml.includes('href="/urunler/kpss"'), true);
  assert.equal(activeHtml.includes("Sınav gününe kadar planın net olsun."), true);
});

test("aktif kod listesi verilmezse tüm registry ürünleri kapalı kalır", () => {
  assert.deepEqual(visiblePublicProducts([]), []);
});

test("registry okunamazsa fallback yalnız çekirdek ürünleri gösterir", () => {
  const products = visiblePublicProducts(FALLBACK_PUBLIC_PRODUCT_CODES);
  assert.deepEqual(
    products.map((product) => product.registryCode),
    legacyCodes,
  );
});
