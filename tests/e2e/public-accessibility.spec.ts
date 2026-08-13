import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/urunler",
  "/urunler/online-dershanem",
  "/urunler/online-kocum",
  "/urunler/online-deneme-kulubum",
  "/dino-ai",
  "/ders-paketleri",
  "/lgs",
  "/yks",
  "/kamplar",
  "/iletisim",
  "/sss",
  "/sepet",
];

for (const route of routes) {
  test(`WCAG A/AA: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

for (const width of [320, 390, 768, 1280, 1440]) {
  test(`homepage reflows without horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 500 ? 844 : 900 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("mobile navigation traps and restores keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Menüyü aç" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Mobil menü" });
  await expect(dialog.getByRole("button", { name: "Menüyü kapat" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("university band is visible and respects reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Seçkin eğitimciler/ })).toBeVisible();
  await expect(page.locator(".university-marquee-track")).toHaveCSS("animation-name", "none");
});
