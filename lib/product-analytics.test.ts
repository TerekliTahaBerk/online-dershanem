import assert from "node:assert/strict";
import { test } from "node:test";
import { analyticsProduct, productCta, reachedScrollDepths } from "./product-analytics";

test("shared commerce and panel paths are never attributed to a product", () => {
  assert.equal(analyticsProduct("/urunler/online-dershanem"), "OD");
  assert.equal(analyticsProduct("/urunler/online-deneme-kulubum"), "ODK");
  assert.equal(analyticsProduct("/urunler/online-kocum"), "OK");
  for (const path of ["/paketler", "/panel/od", "/giris", "/urunler/kpss"]) assert.equal(analyticsProduct(path), undefined);
});

test("CTA attribution only accepts the actual application and known internal destinations", () => {
  const origin = "https://www.onlinedershanem.com";
  assert.deepEqual(productCta("https://tally.so/r/QK6MYp?transparentBackground=1", origin), { cta_kind: "application" });
  assert.deepEqual(productCta("/iletisim?urun=onlinekocum#on-gorusme", origin), { cta_kind: "pre_meeting" });
  assert.deepEqual(productCta("/paketler?token=secret", origin), { cta_kind: "packages" });
  assert.deepEqual(productCta("/urunler/online-kocum", origin), { cta_kind: "product_navigation", target_product: "OK" });
  for (const href of ["", "https://tally.so/r/other", "https://evil.example/paketler", "mailto:test@example.com", "/giris"]) assert.equal(productCta(href, origin), undefined);
});

test("scroll depth measures scrollable distance without counting short pages or initial view", () => {
  assert.deepEqual(reachedScrollDepths(0, 3000, 1000), []);
  assert.deepEqual(reachedScrollDepths(400, 500, 1000), []);
  assert.deepEqual(reachedScrollDepths(500, 3000, 1000), [25]);
  assert.deepEqual(reachedScrollDepths(1500, 3000, 1000), [25, 50, 75]);
  assert.deepEqual(reachedScrollDepths(1999, 3000, 1000), [25, 50, 75, 100]);
});
