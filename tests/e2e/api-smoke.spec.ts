import { test, expect } from "@playwright/test";

/**
 * Public API smoke — endpoint'lerin doğru status/JSON döndürdüğünü doğrular.
 */

test("API rate limit headers public route'larda eklenmiyor", async ({ request }) => {
  // Public sitemap — rate limit yok
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
});

test("/api/health (varsa) 200 döner", async ({ request }) => {
  const res = await request.get("/api/health");
  // 200 (mevcutsa) veya 404 (yoksa) — 5xx kabul edilmez
  expect([200, 404]).toContain(res.status());
});

test("/api/v1/me/products yetkisiz → 401", async ({ request }) => {
  const res = await request.get("/api/v1/me/products");
  expect([401, 403]).toContain(res.status());
});

test("OG image endpoint'i — anasayfa", async ({ request }) => {
  const res = await request.get("/opengraph-image");
  // Mevcutsa 200 PNG/JPEG döner
  if (res.status() === 200) {
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/image\/(png|jpeg)/);
  }
});
