/**
 * Phase 3 / Session 11 — D9: Bulk action UI smokes.
 *
 * `/panel/admin/ogrenciler` listesinde checkbox + bulk action UI'ları render
 * oluyor mu? Non-admin sayfayı göremiyor mu?
 *
 * Idempotent klikleme/CSV export içerik denetimi sonraki turda — bu suite
 * sadece sayfa render gate'i.
 */
import { test, expect } from "./fixtures/auth";

test.describe("D9 — Bulk action surface @smoke", () => {
  test("admin /panel/admin/ogrenciler — sayfa açılıyor", async ({ adminPage }) => {
    const res = await adminPage.goto("/panel/admin/ogrenciler");
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(adminPage).toHaveURL(/\/panel\/admin\/ogrenciler/);
  });

  test("admin /panel/admin/ogretmenler — sayfa açılıyor", async ({ adminPage }) => {
    const res = await adminPage.goto("/panel/admin/ogretmenler");
    expect(res?.status() ?? 0).toBeLessThan(500);
    await expect(adminPage).toHaveURL(/\/panel\/admin\/ogretmenler/);
  });

  test("non-admin /panel/admin/ogrenciler bloklanır", async ({ ogretmenPage }) => {
    await ogretmenPage.goto("/panel/admin/ogrenciler");
    await expect(ogretmenPage).not.toHaveURL(/\/panel\/admin\/ogrenciler\/?$/);
  });
});
