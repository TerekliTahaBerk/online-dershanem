import { test, expect } from "@playwright/test";

/**
 * Public sayfaların smoke testleri — sunucunun ayakta olduğunu ve
 * temel sayfaların 200/HTML döndürdüğünü doğrular.
 */

const PUBLIC_ROUTES = [
  { path: "/", title: /Online Dershanem|online dershane|özel ders/i },
  { path: "/yks", title: /YKS/i },
  { path: "/tyt", title: /TYT/i },
  { path: "/ayt", title: /AYT/i },
  { path: "/lgs", title: /LGS/i },
  { path: "/online-dershane", title: /online dershane/i },
  { path: "/online-ozel-ders", title: /özel ders/i },
  { path: "/paketler", title: /paket/i },
  { path: "/odk-paketleri", title: /ODK|deneme/i },
  { path: "/deneme-kulubu", title: /deneme|ODK/i },
  { path: "/iletisim", title: /iletişim/i },
  { path: "/sss", title: /sıkça|S\.S\.S\.|SSS/i },
  { path: "/kvkk", title: /KVKK/i },
  { path: "/gizlilik", title: /gizlilik/i },
  { path: "/iade", title: /iade/i },
  { path: "/misyonumuz", title: /misyon/i },
  { path: "/kariyer", title: /kariyer/i },
  { path: "/giris", title: /giriş/i },
  { path: "/kayit", title: /kayıt/i },
];

for (const route of PUBLIC_ROUTES) {
  test(`smoke: ${route.path}`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    expect(response, `${route.path} → response yok`).not.toBeNull();
    expect(response!.status(), `${route.path} → status`).toBeLessThan(400);
    // Body yüklendi mi
    await expect(page.locator("body")).toBeVisible();
    // Sayfa title'ı pattern ile eşleşiyor mu
    await expect(page).toHaveTitle(route.title);
  });
}

test("404 sayfası düzgün render oluyor", async ({ page }) => {
  const response = await page.goto("/bu-sayfa-yok-12345", { waitUntil: "domcontentloaded" });
  expect(response!.status()).toBe(404);
  await expect(page.locator("body")).toContainText(/bulunamadı|not found|404/i);
});

test("robots.txt erişilebilir", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/user-agent/i);
});

test("sitemap.xml erişilebilir", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain("<urlset");
});

test("manifest.webmanifest erişilebilir", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json).toHaveProperty("name");
});
