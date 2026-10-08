import { expect, test } from "@playwright/test";
import { publicLegacyRedirects } from "../../lib/public-legacy-redirects";

const landings = ["/hakkimizda", "/sss", "/online-ozel-ders"];

test("aliases send a single permanent HTTP redirect with query parameters intact", async ({ request }) => {
  for (const route of publicLegacyRedirects) {
    const response = await request.get(`${route.source}?utm_source=legacy-test`, { maxRedirects: 0 });
    expect(response.status(), route.source).toBe(308);
    expect(response.headers().location).toBe(`${route.destination}?utm_source=legacy-test`);
    const target = await request.get(route.destination, { maxRedirects: 0 });
    expect(target.status(), route.destination).toBe(200);
  }
});

test("sitemap excludes legacy, checkout, auth and inactive KPSS destinations", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const xml = await response.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
  for (const route of publicLegacyRedirects) expect(paths).not.toContain(route.source);
  for (const path of paths) expect(path).not.toMatch(/satin-al|^\/panel|^\/giris|^\/sepet|^\/kayit|^\/parola/);
  expect(paths).not.toContain("/urunler/kpss");
  for (const path of [...landings, "/urunler", "/urunler/online-deneme-kulubum"]) expect(paths).toContain(path);
});

for (const width of [320, 390, 768, 1440, 1920]) {
  test(`updated public pages share canonical navigation and reflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const route of landings) {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.onlinedershanem.com${route}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), route).toBeLessThanOrEqual(1);
      const legacyLinks = page.locator('a[href="/misyonumuz"], a[href="/kamplar"], a[href="/deneme-kulubu"], a[href="/online-dershane"], a[href="/urunler/kpss"]');
      await expect(legacyLinks).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("Evet. onlinedershanem.'de odak matematik");
    }
    expect(errors).toEqual([]);
  });
}

test("FAQ category navigation and keyboard disclosure expose answers matching JSON-LD", async ({ page }) => {
  await page.goto("/sss");
  await page.getByRole("link", { name: "Dino AI · Ortak destek katmanı", exact: true }).click();
  const item = page.locator("main:visible details").filter({ hasText: "Dino AI ayrı bir ürün mü?" });
  await item.locator("summary").focus();
  await page.keyboard.press("Enter");
  await expect(item).toHaveAttribute("open", "");
  await expect(item).toContainText(/ayrı satılan bir ürün değildir/i);
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = schemas.flatMap((text) => JSON.parse(text)).find((schema) => schema["@type"] === "FAQPage");
  expect(faq.mainEntity.find((question: { name: string }) => question.name === "Dino AI ayrı bir ürün mü?").acceptedAnswer.text).toBe(await item.locator(".public-accordion-content").textContent());
});
