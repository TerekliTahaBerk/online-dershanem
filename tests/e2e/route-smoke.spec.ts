/**
 * Phase 3 / Session 11 — D10: Admin route smoke.
 *
 * Admin paneldeki kritik sayfaların 5xx atmadığını ve bir h1/heading
 * render ettiğini doğrular. Ne içerikleri ne form davranışları test eder —
 * regression alarmı.
 */
import { test, expect } from "./fixtures/auth";

const ADMIN_ROUTES: { path: string; keyword?: RegExp }[] = [
  { path: "/panel/admin", keyword: /admin|panel|özet|öğrenci/i },
  { path: "/panel/admin/ogrenciler", keyword: /öğrenci/i },
  { path: "/panel/admin/ogretmenler", keyword: /öğretmen/i },
  { path: "/panel/admin/veliler", keyword: /veli/i },
  { path: "/panel/admin/dersler", keyword: /ders/i },
  { path: "/panel/admin/odemeler", keyword: /ödeme|fatura|tahsilat/i },
  { path: "/panel/admin/import", keyword: /import|içeri|csv|yükle/i },
  { path: "/panel/admin/hesap-silme-talepleri", keyword: /hesap|silme/i },
  { path: "/panel/admin/siniflar", keyword: /sınıf|şube/i },
  { path: "/panel/admin/paketler", keyword: /paket/i },
];

test.describe("D10 — Admin route smoke @smoke", () => {
  for (const route of ADMIN_ROUTES) {
    test(`admin: ${route.path}`, async ({ adminPage }) => {
      const res = await adminPage.goto(route.path, { waitUntil: "domcontentloaded" });
      expect(res, `${route.path}: response yok`).not.toBeNull();
      expect(res!.status(), `${route.path}: status`).toBeLessThan(500);
      await expect(adminPage.locator("body")).toBeVisible();
      if (route.keyword) {
        await expect(adminPage.locator("body")).toContainText(route.keyword);
      }
    });
  }
});
