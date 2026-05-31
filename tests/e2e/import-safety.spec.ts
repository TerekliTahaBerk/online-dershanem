/**
 * Phase 3 / Session 11 — D8: Safe Import Wizard sanity smokes.
 *
 * Tam UI workflow yerine: admin sayfayı açabiliyor mu, non-admin bloklanıyor mu,
 * dry-run'ın varsayılan davranışı (commit toggle kapalı) DB'de yan etki yaratmıyor mu?
 *
 * Tam CSV upload akışı manual smoke checklist'te bırakıldı; bu suite
 * regression olarak sadece kritik gate'leri kapsıyor.
 */
import { test, expect } from "./fixtures/auth";
import { testPrisma } from "./helpers/db";

test.describe("D8 — Import wizard safety @smoke", () => {
  test("admin /panel/admin/import sayfasını açabilir", async ({ adminPage }) => {
    const res = await adminPage.goto("/panel/admin/import");
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(adminPage).toHaveURL(/\/panel\/admin\/import/);
    // Sayfa içerik smoke
    await expect(adminPage.locator("body")).toContainText(/import|içeri|csv|yükle/i);
  });

  test("non-admin /panel/admin/import sayfasına ulaşamaz", async ({ ogretmenPage }) => {
    await ogretmenPage.goto("/panel/admin/import");
    await expect(ogretmenPage).not.toHaveURL(/\/panel\/admin\/import\/?$/);
  });

  test("sadece sayfa açma DB'de e2e- prefixli yeni User yaratmaz", async ({ adminPage }) => {
    const before = await testPrisma.user.count({
      where: { email: { startsWith: "e2e-" } },
    });
    await adminPage.goto("/panel/admin/import");
    await adminPage.waitForLoadState("networkidle");
    const after = await testPrisma.user.count({
      where: { email: { startsWith: "e2e-" } },
    });
    expect(after).toBe(before);
  });
});
