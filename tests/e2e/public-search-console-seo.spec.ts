import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const productArticles = [
  ["online-dershanem", "online-dershane-fiyatlari-2026"],
  ["online-kocum", "tyt-matematik-calisma-programi"],
  ["online-deneme-kulubum", "matematik-deneme-analizi"],
] as const;

for (const [product, article] of productArticles) {
  test(`product and article link each other: ${product}`, async ({ page }) => {
    await page.goto(`/urunler/${product}`);
    await expect(page.locator("main h1")).toHaveCount(1);
    const reading = page.getByRole("region", { name: "Hazırlığına yön veren rehberler" });
    await expect(reading.locator(`a[href="/blog/${article}"]`)).toBeVisible();
    await reading.locator(`a[href="/blog/${article}"]`).click();
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator(`#related-product-title + p + a[href="/urunler/${product}"]`)).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.onlinedershanem.com/blog/${article}`);
    const schemaText = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(schemaText.join(" ")).toContain('"@type":"BlogPosting"');
  });
}

test("404 keeps noindex without declaring homepage canonical", async ({ page, request }) => {
  const response = await request.get("/seo-audit-nonexistent-page");
  expect(response.status()).toBe(404);
  await page.goto("/seo-audit-nonexistent-page");
  await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  const directives = await page.locator('meta[name="robots"]').evaluateAll(nodes => nodes.map(node => node.getAttribute("content")));
  expect(directives.every(value => value?.includes("noindex"))).toBe(true);
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("sitemap uses the actual reviewed article date and excludes private/alias URLs", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBe(true);
  const text = await response.text();
  expect(text).toMatch(/<loc>https:\/\/www\.onlinedershanem\.com\/blog\/online-dershane-fiyatlari-2026<\/loc>\s*<lastmod>2026-10-26/);
  for (const path of ["/panel", "/api/", "/giris", "/yks</loc>", "/lgs</loc>", "/kariyer"]) expect(text).not.toContain(path);
  const urls = [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(new Set(urls).size).toBe(urls.length);
});

test("price guide states current terms with accessible mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/blog/online-dershane-fiyatlari-2026");
  await expect(page.locator("main h1")).toHaveCount(1);
  const main = page.getByRole("main");
  for (const term of ["₺2.000", "₺4.000", "1.500 TL", "sonraki aylar 2.000 TL", "yalnızca ilk ay"]) await expect(main).toContainText(term);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations.map(value => value.id)).toEqual([]);
});
