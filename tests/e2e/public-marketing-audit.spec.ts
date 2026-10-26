import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const products = [
  { path: "/urunler/online-dershanem", source: "online-dershanem", name: "Online Dershanem" },
  { path: "/urunler/online-kocum", source: "yon-kocluk", name: "Yön Koçluk" },
  { path: "/urunler/online-deneme-kulubum", source: "deneme-ligi", name: "Deneme Ligi" },
];

for (const product of products) {
  test(`${product.name}: rendered metadata, truthful schema and application attribution`, async ({ page, request }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${product.path}?utm_source=instagram&utm_campaign=lgs_2026&email=private%40example.com`);
    await expect(page.locator("main h1")).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://www.onlinedershanem.com${product.path}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /LGS/);
    const application = page.locator('main a[href*="tally.so/r/QK6MYp"]').first();
    await expect(application).toHaveAttribute("href", new RegExp(`source=website_${product.source}.*utm_source=instagram`));
    expect(await application.getAttribute("href")).not.toContain("email");
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
    const service = schemas.flatMap(value => { const data = JSON.parse(value); return Array.isArray(data) ? data : [data]; }).find(value => value["@type"] === "Service");
    expect(service.url).toBe(`https://www.onlinedershanem.com${product.path}`);
    expect(service).not.toHaveProperty("aggregateRating");
    const response = await request.get(product.path);
    const html = await response.text();
    expect(response.status()).toBe(200);
    expect(html).toContain('"@type":"Service"');
    expect(html).toContain("<h1");
    expect(errors).toEqual([]);
  });
}

test("homepage exposes three services and preserves campaign across product discovery", async ({ page }) => {
  await page.goto("/?utm_source=tiktok&utm_campaign=lgs_2026");
  const quick = page.getByRole("navigation", { name: "Hizmetini seç" });
  for (const product of products) await expect(quick.getByRole("link", { name: `${product.name} →`, exact: true })).toBeVisible();
  const coaching = quick.getByRole("link", { name: "Yön Koçluk →", exact: true });
  await expect(coaching).toHaveAttribute("href", /utm_source=tiktok/);
  await coaching.click();
  await expect(page.locator('main a[href*="tally.so/r/QK6MYp"]').first()).toHaveAttribute("href", /source=website_yon-kocluk.*utm_source=tiktok/);
  await expect(page.getByRole("navigation", { name: "Ürünlere hızlı erişim" })).toBeVisible();
});

test("coaching offer is explicit and illustrative plan responds to keyboard", async ({ page }) => {
  await page.goto("/urunler/online-kocum");
  await expect(page.getByRole("main")).toContainText("İlk ay 1.500 TL");
  await expect(page.getByRole("main")).toContainText("Sonraki aylar 2.000 TL / ay");
  await expect(page.getByRole("main")).toContainText("İndirim yalnızca ilk ay");
  await expect(page.getByRole("main")).not.toContainText("3.000");
  const day = page.getByRole("button", { name: "Çarşamba", exact: true });
  await day.focus(); await day.press("Enter");
  await expect(day).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Matematik · Konu tekrarı", exact: true })).toBeVisible();
});

test("exam example switches between LGS, TYT and AYT without promising availability", async ({ page }) => {
  await page.goto("/urunler/online-deneme-kulubum");
  await page.getByRole("button", { name: "TYT", exact: true }).click();
  await expect(page.getByRole("table", { name: "TYT için temsili ders netleri" })).toBeVisible();
  await page.getByRole("button", { name: "AYT", exact: true }).click();
  await expect(page.getByRole("table", { name: "AYT için temsili ders netleri" })).toBeVisible();
  await expect(page.getByText(/gerçek öğrenci verisi ve sonuç garantisi değildir/)).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`responsive product pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const path of ["/", "/urunler", ...products.map(product => product.path), "/paketler"]) {
      await page.goto(path);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(1);
      await expect(page.locator("main h1")).toHaveCount(1);
      await expect(page.locator("main h1")).toBeVisible();
    }
  });
}

test("mobile menu exposes products, closes with Escape and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Menüyü aç" });
  await toggle.click();
  const dialog = page.getByRole("dialog", { name: "Mobil menü" });
  for (const product of products) await expect(dialog.locator(`a[href="${product.path}"]`)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(toggle).toBeFocused();
});

test("robots, sitemap, 404 and legacy redirect preserve crawler behavior", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true); expect(await robots.text()).toContain("Sitemap:");
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  for (const product of products) expect(await sitemap.text()).toContain(product.path);
  const redirect = await request.get("/lgs?utm_source=instagram", { maxRedirects: 0 });
  expect(redirect.status()).toBe(308); expect(redirect.headers().location).toContain("utm_source=instagram");
  expect((await request.get("/marketing-audit-missing")).status()).toBe(404);
});

test("new product interactions satisfy WCAG 2.2 AA automated rules", async ({ page }) => {
  for (const product of products) {
    await page.goto(product.path);
    const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(results.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) })), product.path).toEqual([]);
  }
});
