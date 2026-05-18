import { test, expect } from "@playwright/test";

/**
 * Public sayfaların smoke testleri — sunucunun ayakta olduğunu ve
 * temel sayfaların 200/HTML döndürdüğünü doğrular.
 */

const PUBLIC_ROUTES = [
  { path: "/", keyword: /online dershanem|dershane|özel ders|yks|tyt|lgs/i },
  { path: "/yks", keyword: /yks|tyt|ayt|paket/i },
  { path: "/tyt", keyword: /tyt|paket/i },
  { path: "/ayt", keyword: /ayt|paket/i },
  { path: "/lgs", keyword: /lgs|paket/i },
  { path: "/online-dershane", keyword: /online dershane|grup|takip/i },
  { path: "/online-ozel-ders", keyword: /özel ders|birebir|paket/i },
  { path: "/paketler", keyword: /paket|ders/i },
  { path: "/odk-paketleri", keyword: /odk|deneme|kulüb|paket/i },
  { path: "/deneme-kulubu", keyword: /deneme|odk|kulüb/i },
  { path: "/iletisim", keyword: /letişim|telefon|e-posta|whatsapp/i },
  { path: "/sss", keyword: /sıkça|soru|cevap/i },
  { path: "/kvkk", keyword: /kvkk|kişisel|aydınlatma/i },
  { path: "/gizlilik", keyword: /gizlilik|veri/i },
  { path: "/iade", keyword: /ade|iptal|cayma/i },
  { path: "/misyonumuz", keyword: /misyon|hakk|kuruluş|biz/i },
  { path: "/kariyer", keyword: /kariyer|pozisyon|ekip/i },
  { path: "/giris", keyword: /giriş|şifre|e-posta|hesab/i },
  { path: "/kayit", keyword: /kayıt|hesap|şifre|e-posta/i },
];

for (const route of PUBLIC_ROUTES) {
  test(`smoke: ${route.path}`, async ({ page }) => {
    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    expect(response, `${route.path} → response yok`).not.toBeNull();
    expect(response!.status(), `${route.path} → status`).toBeLessThan(400);
    // Body yüklendi mi
    await expect(page.locator("body")).toBeVisible();
    // Brand title her sayfada (root layout veya page metadata template'i)
    await expect(page).toHaveTitle(/online dershanem/i);
    // Sayfa-spesifik anahtar kelime body'de var mı (Türkçe-İ safe — body içeriği)
    await expect(page.locator("body")).toContainText(route.keyword);
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
