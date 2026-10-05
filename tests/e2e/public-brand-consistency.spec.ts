import { expect, test } from "@playwright/test";
import { yonBrand } from "../../lib/yon-brand";
import { denemeLigiBrand } from "../../lib/deneme-ligi-brand";

const brands = [yonBrand, denemeLigiBrand];
for (const width of [320, 390, 768, 1440]) {
  test(`brand family keeps paired menu, card and footer presentation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/urunler");
    await page.waitForFunction(() => {
      const button = document.querySelector("header button");
      return button && Object.keys(button).some((key) => key.startsWith("__reactFiber$"));
    });
    if (width >= 1024) await page.getByRole("button", { name: "Ürünler menüsü" }).click();
    else await page.getByRole("button", { name: /Menüyü aç/ }).click();
    for (const brand of brands) {
      const menuLink = (width >= 1024 ? page.locator("header") : page.getByRole("dialog", { name: "Mobil menü" })).getByRole("link", { name: brand.name, exact: true });
      await expect(menuLink).toBeVisible();
      await expect(menuLink).toHaveAttribute("href", brand.href);
      await expect(menuLink.locator("img")).toHaveCount(1);
      expect(await menuLink.locator("img").getAttribute("src")).toContain(encodeURIComponent(brand.mascot));
    }
    await page.keyboard.press("Escape");
    if (width < 1024) await page.locator("footer details summary").filter({ hasText: "Ürünler" }).click();
    for (const brand of brands) {
      const card = page.locator("article").filter({ has: page.locator(`[data-product-brand="${brand === yonBrand ? "blue" : "purple"}"]`) });
      await expect(card).toHaveCount(1);
      await expect(card).toContainText(brand.parentName);
      await expect(card).toContainText(`× ${brand.shortName}`);
      await expect(card.locator("img")).toHaveCount(1);
      expect(await card.locator("img").getAttribute("src")).toContain(encodeURIComponent(brand.logo));
      expect(await card.locator("img").evaluate(img => img.getBoundingClientRect().height)).toBe(171);
      await expect(page.locator("footer").getByRole("link", { name: brand.name, exact: true }).first()).toHaveText(brand.shortName);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440) {
      await page.getByRole("button", { name: "Ürünler menüsü" }).click();
      await page.screenshot({ path: "/tmp/paired-brands-menu-1440.png" });
    }
  });
}
