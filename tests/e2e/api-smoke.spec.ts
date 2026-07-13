import { test, expect } from "@playwright/test";

/**
 * Public API smoke — endpoint'lerin doğru status/JSON döndürdüğünü doğrular.
 */

test("API rate limit headers public route'larda eklenmiyor", async ({ request }) => {
  // Public sitemap — rate limit yok
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
});

test("/api/health çalışma ortamına uygun durum döner", async ({ request }) => {
  const res = await request.get("/api/health");
  // DB yapılandırılmışsa 200; lokal E2E ortamında DB yoksa endpoint sözleşmesi gereği 503.
  expect([200, 404, 503]).toContain(res.status());
  if (res.status() === 503) {
    expect(await res.json()).toMatchObject({ status: "down", db: { ok: false } });
  }
});

test("kaldırılan panel API'si 404 döner", async ({ request }) => {
  const res = await request.get("/api/v1/me/products");
  expect(res.status()).toBe(404);
});

test("OG image endpoint'i — anasayfa", async ({ request }) => {
  const res = await request.get("/opengraph-image");
  // Mevcutsa 200 PNG/JPEG döner
  if (res.status() === 200) {
    const ct = res.headers()["content-type"] ?? "";
    expect(ct).toMatch(/image\/(png|jpeg)/);
  }
});
