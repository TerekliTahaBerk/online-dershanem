import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/panel-login";
import { hasE2EEnv } from "./env-requirements";

/**
 * DESIGN PHASE 2 — onlinedershanem. öğrenci, öğretmen ve yönetim sayfaları
 * (docs/panel-design-roadmap.md §9).
 */

const account = (role: "ADMIN" | "STUDENT" | "TEACHER") => ({
  email: process.env[`PANEL_E2E_${role}_EMAIL`]!,
  password: process.env[`PANEL_E2E_${role}_PASSWORD`]!,
  failureLabel: role,
});

test.describe("Design Phase 2 — onlinedershanem. sayfaları", () => {
  test.skip(!hasE2EEnv("adminAccount", "studentAccount", "teacherAccount"), "E2E hesapları tanımlı değil");

  test("öğrenci ana sayfası Şimdi bloğu ve tek Bugün listesi gösterir; sayı kutusu yok", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("STUDENT"));
    await page.goto("/panel/ogrenci");
    const main = page.getByRole("main");
    await expect(main.getByText("Şimdi", { exact: false }).first()).toBeVisible();
    await expect(main.getByRole("heading", { name: "Bugün", level: 2 })).toBeVisible();
    // Eski üç ayrı liste ("Sonra", "Bugünün tamamı") tek listeye indi.
    await expect(main.getByRole("heading", { name: "Sonra", exact: true })).toHaveCount(0);
    await expect(main.getByRole("heading", { name: "Bugünün tamamı", exact: true })).toHaveCount(0);
    await expect(main.getByText("Yaklaşan deneme", { exact: true })).toHaveCount(0);
  });

  test("öğrenci tekrar ve telafi arasında sekmeyle geçer", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("STUDENT"));
    await page.goto("/panel/ogrenci/tekrar");
    const tabs = page.getByRole("navigation", { name: "Tekrar ve telafi" });
    await expect(tabs.getByRole("link", { name: "Tekrar" })).toHaveAttribute("aria-current", "page");
    await tabs.getByRole("link", { name: "Kaçırılan ders telafisi" }).click();
    await expect(page).toHaveURL(/\/panel\/ogrenci\/telafi/);
    await expect(page.getByRole("navigation", { name: "Tekrar ve telafi" }).getByRole("link", { name: "Kaçırılan ders telafisi" })).toHaveAttribute("aria-current", "page");
  });

  test("öğretmen öğrenci listesini tablo olarak görür", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("TEACHER"));
    await page.goto("/panel/ogretmen/gruplar");
    await expect(page.getByRole("navigation", { name: "Öğrenci görünümü" })).toBeVisible();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: "Ada Öğrenci" }).first().getByRole("link", { name: "Öğrenci profili" })).toBeVisible();
  });

  test("yönetim eğitim sayfası sekmelere bölünür; eski çapa doğru sekmeye gider", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("ADMIN"));
    await page.goto("/panel/yonetim/egitim");
    const tabs = page.getByRole("navigation", { name: "Eğitim bölümleri" });
    await expect(tabs.getByRole("link", { name: "Gruplar" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("main").getByRole("heading", { name: "Gruplar", level: 2 })).toBeVisible();

    await tabs.getByRole("link", { name: "Ödevler" }).click();
    await expect(page).toHaveURL(/sekme=odevler/);
    await expect(page.locator("#odev-merkezi")).toBeVisible();

    await page.goto("/panel/yonetim/egitim#ders-planla");
    await page.waitForURL(/sekme=planlama/);
    await expect(page.locator("#ders-planla")).toBeVisible();
  });
});
