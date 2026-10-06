import { expect, test } from "@playwright/test";
import { yonBrand } from "../../lib/yon-brand";
import { application } from "../../lib/application";
import { formatCents, resolvePackageQuote, singleProductPriceLabel, type BuilderSelection } from "../../lib/commerce/package-builder-pricing";
import { accessibilityScan } from "./helpers/axe";

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`Yön landing uses the correct single asset and reflows at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const assets: string[] = [];
    page.on("request", (request) => {
      const url = new URL(request.url());
      const source = url.searchParams.get("url");
      if (request.resourceType() === "image" && source?.startsWith("/yon/")) assets.push(source);
    });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const response = await page.goto(yonBrand.href);
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(/onlinekoçum\. × Yön Koçluk/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yönünü belirle.Planını uygula.");
    // Streamed HTML can briefly contain a hidden replacement tree before React
    // commits it. Check the rendered page, including its single visible asset.
    const heroImage = page.locator("main:visible picture img");
    await expect(heroImage).toBeVisible();
    await expect.poll(() => heroImage.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
    const expectedAsset = width < 768 ? yonBrand.mascot : yonBrand.logo;
    expect(new URL(await heroImage.evaluate((node: HTMLImageElement) => node.currentSrc)).searchParams.get("url")).toBe(expectedAsset);
    expect([...new Set(assets)]).toEqual([expectedAsset]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.getByRole("main")).toContainText(yonBrand.registrationNote);
    await expect(page.getByText("Örnek görünüm", { exact: true })).toHaveCount(2);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/urunler\/online-kocum$/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/yon\/og.png$/);
    expect(await page.getByRole("main").getByText("LGS", { exact: true }).evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(239, 246, 255)");
    expect(errors).toEqual([]);
    if (width === 390 || width === 1440) await page.screenshot({ path: `/tmp/yon-landing-${width}.png`, fullPage: false });
  });
}

test("Yön anchor, FAQ, structured data and existing consultation form work", async ({ page }) => {
  await page.route("https://tally.so/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Ön görüşme formu</h1>" }));
  await page.goto(yonBrand.href);
  const main = page.getByRole("main");
  await expect(main).toBeVisible();
  await expect(page.getByRole("status", { name: "Sayfa yükleniyor", includeHidden: true })).toHaveCount(0);
  await main.getByRole("link", { name: "Koçluk nasıl çalışır?", exact: true }).click();
  await expect(page).toHaveURL(/#nasil-calisir$/);
  await expect(main.getByRole("heading", { name: "Hedefinden haftalık planına, birlikte." })).toBeInViewport();
  const faq = main.locator("details").filter({ hasText: "Koçum gerçek bir insan mı?" });
  await faq.locator("summary").click();
  await expect(faq).toContainText("insan koçunla");
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const structured = schemas.flatMap((value) => {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [parsed];
  });
  expect(structured.find((schema) => schema["@type"] === "FAQPage").mainEntity).toHaveLength(7);
  const breadcrumb = structured.find((schema) => schema["@type"] === "BreadcrumbList");
  expect(breadcrumb.itemListElement.at(-1).name).toBe(yonBrand.mediumName);
  await main.getByRole("link", { name: "Ücretsiz Ön Görüşme", exact: true }).first().click();
  await expect(page).toHaveURL(yonBrand.meetingHref);
  await expect(page.locator("#on-gorusme-title")).toBeInViewport({ timeout: 15_000 });
  await expect(page.getByTitle("onlinedershanem. Kısa Ön Görüşme Formu")).toBeVisible();
});

const base: BuilderSelection = { exam: "LGS", dershanem: false, kocum: false, denemeKulubum: false, format: "grup", subject: "Matematik", extraSubjects: [] };
for (let mask = 0; mask < 8; mask++) {
  test(`Yön presentation preserves quote and application behavior for combination ${mask}`, async ({ page }) => {
    await page.goto("/paketler");
    await page.getByRole("button", { name: /LGS sınavına gireceğim/ }).click();
    const selection = { ...base, dershanem: !!(mask & 1), kocum: !!(mask & 2), denemeKulubum: !!(mask & 4) };
    for (const [key, label] of [["dershanem", /onlinedershanem\./], ["kocum", /onlinekoçum\..*Yön Koçluk/], ["denemeKulubum", /onlinedenemekulübüm\..*Deneme Ligi/]] as const) {
      const button = page.getByRole("button", { name: label }).first();
      if (selection[key]) await button.click();
      await expect(button).toHaveAttribute("aria-pressed", String(selection[key]));
    }
    const summary = page.getByRole("complementary", { name: "Paket özeti" });
    await expect(summary).toContainText(yonBrand.shortName);
    const quote = resolvePackageQuote(selection);
    for (const total of [quote.monthlyTotal, quote.periodTotal].filter((total) => total.selectedLineCount > 0)) {
      await expect(summary).toContainText(formatCents(total.payableCents!));
      await expect(summary).toContainText(total.billing === "monthly" ? "Aylık" : "Dönemlik");
    }
    if (mask) await expect(summary.getByRole("link", { name: "Başvur", exact: true })).toHaveAttribute("href", application.href);
    else await expect(summary.locator('[aria-disabled="true"]')).toHaveText("Başvur");
  });
}

test("Yön landing is accessible, respects reduced motion and uses the shared price source", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(yonBrand.href);
  await expect(page.getByRole("main")).toContainText(singleProductPriceLabel("kocum")!.price);
  expect((await accessibilityScan(page).analyze()).violations).toEqual([]);
  expect(await page.locator("main").evaluate((node) => [...node.querySelectorAll("*")].filter((element) => getComputedStyle(element).animationName !== "none").length)).toBe(0);
});

for (const width of [320, 375, 390, 768, 1024, 1440]) {
  test(`Yön and Deneme Ligi stay distinct across shared surfaces at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/urunler", "/paketler"]) {
      await page.goto(route);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      if (route === "/paketler") {
        const yon = page.getByRole("button", { name: /onlinekoçum\..*Yön Koçluk/ }).first();
        const league = page.getByRole("button", { name: /onlinedenemekulübüm\..*Deneme Ligi/ }).first();
        expect(await yon.locator("img").getAttribute("src")).toContain(encodeURIComponent(yonBrand.mascot));
        await expect(yon).toContainText(singleProductPriceLabel("kocum")!.price);
        await yon.click();
        await expect(yon).toHaveAttribute("aria-pressed", "true");
        expect(await yon.locator('[data-product-brand]').evaluate((node) => getComputedStyle(node).color)).not.toBe(await league.locator('[data-product-brand]').evaluate((node) => getComputedStyle(node).color));
      } else {
        const card = page.locator("article").filter({ has: page.getByRole("heading", { name: yonBrand.cardHeadline, exact: true }) });
        await expect(card).toHaveCount(1);
        await expect(card.locator("img")).toHaveCount(1);
        await expect(card.getByRole("link", { name: yonBrand.inspectLabel })).toHaveAttribute("href", yonBrand.href);
        await expect(page.locator("article:visible").filter({ hasText: "Deneme Ligi" }).locator('img[src*="deneme-ligi"]')).toBeVisible();
      }
      if (width === 1440 && route === "/urunler") await page.screenshot({ path: "/tmp/yon-products-1440.png", fullPage: true });
      if (width === 390 && route === "/paketler") await page.screenshot({ path: "/tmp/yon-packages-390.png", fullPage: true });
    }
  });
}

test("homepage FAQ schema exactly matches the visible FAQ", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("main:visible")).toHaveCount(1);
  const schemas = await page.locator('script[type="application/ld+json"]').allTextContents();
  const faq = schemas.map((text) => JSON.parse(text)).find((schema) => schema["@type"] === "FAQPage");
  const questions = await page.locator("main:visible details summary").allTextContents();
  expect(questions.map((text) => text.replace(/\s*\+\s*$/, "").trim())).toEqual(faq.mainEntity.map((entry: { name: string }) => entry.name));
  const answers = await page.locator("main:visible details p").allTextContents();
  expect(answers.map((text) => text.trim())).toEqual(faq.mainEntity.map((entry: { acceptedAnswer: { text: string } }) => entry.acceptedAnswer.text));
});
