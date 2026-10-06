import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/panel-login";
import { hasE2EEnv } from "./env-requirements";

/**
 * DESIGN PHASE 1 — kabuk davranışları (docs/panel-design-roadmap.md §6, §8.7).
 */

const account = (role: "ADMIN" | "STUDENT") => ({
  email: process.env[`PANEL_E2E_${role}_EMAIL`]!,
  password: process.env[`PANEL_E2E_${role}_PASSWORD`]!,
  failureLabel: role,
});

test.describe("Design Phase 1 — panel kabuğu", () => {
  test.skip(!hasE2EEnv("adminAccount", "studentAccount"), "E2E hesapları tanımlı değil");

  test("kenar çubuğu gizlenir, tercih yenilemeden sonra korunur ve geri açılır", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("ADMIN"));
    await page.goto("/panel/yonetim");
    // İstemci bileşenleri hydrate olmadan tıklanan düğme işleyicisizdir.
    await page.waitForLoadState("networkidle");
    const sidebarNav = page.getByRole("complementary").getByRole("navigation", { name: "Panel menüsü" });
    await expect(sidebarNav).toBeVisible();

    await page.getByRole("button", { name: /Kenar çubuğunu gizle/ }).click();
    await expect(sidebarNav).toBeHidden();
    const open = page.getByRole("button", { name: /Kenar çubuğunu göster/ });
    await expect(open).toBeFocused();

    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("complementary").getByRole("navigation", { name: "Panel menüsü" })).toBeHidden();
    await page.getByRole("button", { name: /Kenar çubuğunu göster/ }).click();
    await expect(page.getByRole("complementary").getByRole("navigation", { name: "Panel menüsü" })).toBeVisible();

    // Kısayol: Ctrl+\ iki kez → gizle, göster.
    await page.keyboard.press("Control+Backslash");
    await expect(page.getByRole("complementary").getByRole("navigation", { name: "Panel menüsü" })).toBeHidden();
    await page.keyboard.press("Control+Backslash");
    await expect(page.getByRole("complementary").getByRole("navigation", { name: "Panel menüsü" })).toBeVisible();
  });

  test("öğrenci komut menüsü sayfa komutlarını gösterir ve kayıt aramasına istek atmaz", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("STUDENT"));
    await page.goto("/panel/ogrenci");
    await page.waitForLoadState("networkidle");
    let searched = false;
    page.on("request", (request) => {
      if (new URL(request.url()).pathname === "/api/panel/admin-search") searched = true;
    });
    const trigger = page.getByRole("button", { name: "Panelde ara" }).first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Panel arama ve komut paleti" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("combobox").fill("Ayar");
    await expect(dialog.getByText("Ayarlar", { exact: true })).toBeVisible();
    await dialog.getByRole("combobox").fill("Çalış");
    await expect(dialog.getByText("Çalışmalar", { exact: true })).toBeVisible();
    await page.waitForTimeout(400);
    expect(searched).toBe(false);

    // Kısayol da aynı menüyü açar.
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await page.keyboard.press("Control+k");
    await expect(dialog).toBeVisible();
  });

  test("çalışma alanı değiştirici erişilebilen ürünleri ve tüm alanlar bağlantısını listeler", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("STUDENT"));
    await page.goto("/panel/ogrenci");
    await page.waitForLoadState("networkidle");
    const trigger = page.getByRole("button", { name: /Çalışma alanı:/ });
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("link", { name: "onlinedershanem." })).toBeVisible();
    await expect(page.getByRole("link", { name: "Tüm çalışma alanları" })).toHaveAttribute("href", "/panel/urun-sec");
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  });
});
