/**
 * Phase 3 / Session 11 — D6: Access boundary smokes.
 *
 * Amaç: Yetkisiz rol yetkili rotalara erişemiyor mu? Forge edilmiş
 * studentId/parentId parametreleri başka veliye sızdırmıyor mu?
 *
 * Bu testler API + UI seviyesinde minimum cover sağlar; tam fuzzing
 * değil — kritik regresyon ağı.
 */
import { test, expect } from "./fixtures/auth";

test.describe("D6 — Access boundaries @smoke", () => {
  test("non-admin → /panel/admin/import bloklanır", async ({ ogretmenPage }) => {
    const res = await ogretmenPage.goto("/panel/admin/import");
    // ya 403/redirect, ya 404 — 200 admin import sayfasına ulaşmamalı
    if (res && res.status() === 200) {
      await expect(ogretmenPage).not.toHaveURL(/\/panel\/admin\/import\/?$/);
    }
  });

  test("non-admin → /panel/admin/ogrenciler bloklanır", async ({ ogrenciPage }) => {
    const res = await ogrenciPage.goto("/panel/admin/ogrenciler");
    if (res && res.status() === 200) {
      await expect(ogrenciPage).not.toHaveURL(/\/panel\/admin\/ogrenciler\/?$/);
    }
  });

  test("non-admin → /panel/admin/odemeler bloklanır", async ({ veliPage }) => {
    const res = await veliPage.goto("/panel/admin/odemeler");
    if (res && res.status() === 200) {
      await expect(veliPage).not.toHaveURL(/\/panel\/admin\/odemeler\/?$/);
    }
  });

  test("öğrenci paneli — başka öğrenciye ait sayfa bloklanır (forged path)", async ({ ogrenciPage }) => {
    // Olmayan/farklı bir studentId ile öğrenci profili açılmamalı.
    // Öğrenci kendi panelinde sadece kendi verisini görmeli.
    await ogrenciPage.goto("/panel/ogrenci/odk/paketim?studentId=forged-id-xyz");
    // URL'de query param görünebilir ama sayfa kendi verisini render etmeli.
    // Next.js ham HTML'i route/search-param metadata'sı içerir; güvenlik
    // invariant'ı kullanıcıya render edilen içerikte doğrulanmalı.
    await expect(ogrenciPage.locator("body")).not.toContainText("forged-id-xyz");
    // Yetkisiz/kırık değil — 200 + kendi paketim sayfası
    await expect(ogrenciPage.locator("body")).toContainText(/paket|deneme/i);
  });

  test("anonim → /panel/admin/* sayfaları /giris'e yönlenir", async ({ page }) => {
    await page.goto("/panel/admin/ogretmenler");
    await expect(page).toHaveURL(/\/giris/);
  });
});
