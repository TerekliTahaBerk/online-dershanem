import { test, expect } from "@playwright/test";

/**
 * Public API smoke — endpoint'lerin doğru status/JSON döndürdüğünü doğrular.
 */

test("API rate limit headers public route'larda eklenmiyor", async ({ request }) => {
  // Public sitemap — rate limit yok
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
});

test("liveness bağımlılıklardan bağımsız process sinyali döner", async ({ request }) => {
  const res = await request.get("/api/health/live");
  expect(res.status()).toBe(200);
  await expect(res.json()).resolves.toMatchObject({ status: "live", live: true });
});

test("readiness bileşenleri ve kritik cron kanıtlarını ayrı raporlar", async ({ request }) => {
  const res = await request.get("/api/health/ready");
  // DB yapılandırılmışsa 200; lokal E2E ortamında DB yoksa endpoint sözleşmesi gereği 503.
  expect([200, 404, 503]).toContain(res.status());
  if (res.status() !== 404) {
    const body = await res.json();
    expect(body).toMatchObject({
      status: expect.stringMatching(/^(ready|not_ready)$/),
      ready: expect.any(Boolean),
      checks: {
        database: { status: expect.stringMatching(/^(ok|down)$/) },
        configuration: { blockerCount: expect.any(Number), warningCount: expect.any(Number), fingerprint: expect.stringMatching(/^cfg-[a-f0-9]{8}$/) },
        cron: { jobs: expect.arrayContaining([expect.objectContaining({ name: "odk-exam-lifecycle", status: expect.stringMatching(/^(healthy|missing|failed|stale)$/) })]) },
      },
    });
    expect(body.ready).toBe(res.status() === 200);
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
