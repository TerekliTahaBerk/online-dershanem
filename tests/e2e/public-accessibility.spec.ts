import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/urunler",
  "/urunler/online-dershanem",
  "/urunler/online-kocum",
  "/urunler/online-deneme-kulubum",
  "/dino-ai",
  // Paket kurucu: sitedeki en etkileşimli public yüzey ve fiyat/indirim
  // gösteriminin tek yeri — sweep dışında kalmamalı.
  "/paketler",
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

/*
 * "University band" (kayan eğitimci şeridi) onaylı tasarımda YOK: ana sayfanın
 * bölüm haritası (01–15) böyle bir şerit içermiyor ve bölüm kaldırıldı.
 * Test, var olmayan bir bileşeni beklediği için kaldırıldı — iddia
 * zayıflatılmadı, konusu ortadan kalktı.
 *
 * Hareket azaltma güvencesi kaybolmasın diye ana sayfada animasyon
 * kalmadığı burada doğrulanır.
 */
test("ana sayfa reduced-motion tercihine uyar", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const animated = await page.evaluate(() =>
    [...document.querySelectorAll("*")].filter((el) => {
      const name = getComputedStyle(el).animationName;
      return name && name !== "none";
    }).length,
  );
  expect(animated).toBe(0);
});
