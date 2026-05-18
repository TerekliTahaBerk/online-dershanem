import { test, expect } from "@playwright/test";

/**
 * Auth akışı smoke testleri — gerçek hesap oluşturmadan,
 * korumalı route'ların login'e yönlendirdiğini doğrular.
 */

const PROTECTED_ROUTES = [
  "/panel",
  "/panel/ogrenci",
  "/panel/ogretmen",
  "/panel/veli",
  "/panel/admin",
  "/panel/ogrenci/profilim",
  "/panel/ogrenci/odk/paketim",
  "/panel/admin/ogrenciler",
  "/panel/admin/hesap-silme-talepleri",
];

for (const path of PROTECTED_ROUTES) {
  test(`auth gate: ${path} → /giris yönlendirir`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: "domcontentloaded" });
    expect(response).not.toBeNull();
    // 200 (giris sayfası) veya 3xx → final URL /giris olmalı
    await expect(page).toHaveURL(/\/giris/);
  });
}

test("giriş formu render oluyor", async ({ page }) => {
  await page.goto("/giris");
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test("kayıt formu render oluyor", async ({ page }) => {
  await page.goto("/kayit");
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
});

test("şifremi unuttum sayfası açılıyor", async ({ page }) => {
  await page.goto("/sifremi-unuttum");
  await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
});
