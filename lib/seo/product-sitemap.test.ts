import assert from "node:assert/strict";
import test from "node:test";

import { kpssSitemapRoutes } from "./product-sitemap";

test("KPSS pasifken sitemap route'u üretilmez", () => {
  assert.deepEqual(kpssSitemapRoutes("https://example.com", ["OD", "OK", "ODK"]), []);
});

test("KPSS aktifken sitemap route'u doğru canonical ile üretilir", () => {
  assert.deepEqual(kpssSitemapRoutes("https://example.com", ["OD", "OK", "ODK", "KPSS"]), [
    {
      url: "https://example.com/urunler/kpss",
      changeFrequency: "weekly",
      priority: 0.9,
    },
  ]);
});
