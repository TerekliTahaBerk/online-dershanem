import assert from "node:assert/strict";
import test from "node:test";
import {
  publicProductBySlug,
  publicProducts,
  sharedIntelligenceLayer,
} from "./product-architecture";

test("public architecture exposes four unique first-class product definitions", () => {
  assert.equal(publicProducts.length, 4);
  assert.equal(new Set(publicProducts.map((product) => product.slug)).size, 4);
  assert.equal(new Set(publicProducts.map((product) => product.href)).size, 4);
  assert.ok(publicProducts.every((product) => product.href.startsWith("/urunler/")));
});

test("exam positioning is explicit for each product", () => {
  assert.deepEqual(publicProductBySlug["online-dershanem"].audiences, ["LGS", "YKS"]);
  assert.deepEqual(publicProductBySlug["online-kocum"].audiences, ["LGS", "YKS"]);
  assert.deepEqual(publicProductBySlug["online-deneme-kulubum"].audiences, ["LGS", "TYT", "AYT"]);
  assert.deepEqual(publicProductBySlug.kpss.audiences, ["KPSS"]);
});

test("Dino AI is shared by every first-class product", () => {
  assert.equal(sharedIntelligenceLayer.name, "Dino AI");
  assert.deepEqual(
    sharedIntelligenceLayer.productSlugs,
    publicProducts.map((product) => product.slug),
  );
});
