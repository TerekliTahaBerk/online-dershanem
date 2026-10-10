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
    await tabs.getByRole("link", { name: "Kaçırdığın derslerin telafisi" }).click();
    await expect(page).toHaveURL(/\/panel\/ogrenci\/telafi/);
    await expect(page.getByRole("navigation", { name: "Tekrar ve telafi" }).getByRole("link", { name: "Kaçırdığın derslerin telafisi" })).toHaveAttribute("aria-current", "page");
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

  test("ödev ayrıntısı URL'ye bağlı yan panelde açılır; Escape kapatır ve odak geri döner", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("STUDENT"));
    await page.goto("/panel/ogrenci/odevler");
    await page.waitForLoadState("networkidle");
    const row = page.getByRole("article").filter({ hasText: "E2E Yeni Nesil Sorular" }).first();
    // Durum düğmeleri satırda kalır; ayrıntı yan panelde.
    await expect(row.getByRole("button", { name: "Tamamladım" })).toBeVisible();
    const opener = row.getByRole("button", { name: "E2E Yeni Nesil Sorular ayrıntıları" });
    await opener.click();
    await expect(page).toHaveURL(/onizle=odev/);
    const drawer = page.getByRole("dialog", { name: "E2E Yeni Nesil Sorular" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("button", { name: "Paneli kapat" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(page).not.toHaveURL(/onizle=/);
    await expect(opener).toBeFocused();

    // Bağlantı paylaşılabilir: URL ile doğrudan açılır.
    await page.goto(page.url() + (page.url().includes("?") ? "&" : "?") + "onizle=odev:e2e-assignment");
    await expect(page.getByRole("dialog", { name: "E2E Yeni Nesil Sorular" })).toBeVisible();
  });

  test("yönetim takvimi ve kazanımlar düz bölümlerle açılır; filtre ve sürüm akışı korunur", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("ADMIN"));
    await page.goto("/panel/yonetim/takvim");
    await expect(page.getByRole("link", { name: "Önceki hafta" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("combobox", { name: "Öğretmene göre filtrele" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Tüm programı indir/ })).toBeVisible();
    await page.getByRole("link", { name: "Sonraki hafta" }).click();
    await expect(page).toHaveURL(/week=1/);

    await page.goto("/panel/yonetim/kazanimlar");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Müfredat sürümleri", level: 2 })).toBeVisible();
    await expect(main.getByLabel("Sürüm kodu")).toBeVisible();
    await expect(main.getByLabel("Müfredat sürümü")).toBeVisible();
    await expect(main.locator(".panel-metric-card")).toHaveCount(0);
  });

  test("öğretmen gidişatı sayı kutusu yerine özellik satırları ve tablo gösterir", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("TEACHER"));
    await page.goto("/panel/ogretmen/analiz");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Grup gidişatı", level: 1 })).toBeVisible();
    if (await main.getByText("Kapsamda öğrenci yok.").count()) return;
    await expect(main.getByRole("heading", { name: "Grup ortalamaları", level: 2 })).toBeVisible();
    await expect(main.getByText("Ortalama katılım", { exact: true })).toBeVisible();
    await expect(main.getByRole("table")).toBeVisible();
  });
});
