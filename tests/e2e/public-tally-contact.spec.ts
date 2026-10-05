import { expect, test } from "@playwright/test";
import { builderContactQuery } from "../../lib/commerce/package-builder-pricing";

const title = "onlinedershanem. Kısa Ön Görüşme Formu";

test.beforeEach(async ({ page }) => {
  // External service content is not submitted. Keep its real origin for messages.
  await page.route("https://tally.so/**", (route) => route.fulfill({
    contentType: "text/html; charset=utf-8",
    body: '<!doctype html><html lang="tr"><title>Tally fixture</title><body><label>Adınız <input></label></body></html>',
  }));
});

for (const width of [390, 1440]) {
  test(`public contact iframe, channels and responsive columns @${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    const response = await page.goto("/iletisim#on-gorusme");
    expect(response?.ok()).toBe(true);
    expect(response?.headers()["content-security-policy"]).toContain("https://tally.so");
    const iframe = page.getByTitle(title);
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toBeVisible();
    await expect(iframe).toHaveAttribute("loading", "lazy");
    const url = new URL((await iframe.getAttribute("src"))!);
    expect(url.pathname).toBe("/embed/0QpdQB");
    expect([...url.searchParams.keys()].sort()).toEqual(["alignLeft", "dynamicHeight", "hideTitle", "transparentBackground"]);
    await expect(page.getByRole("complementary", { name: "Seçiminiz" })).toHaveCount(0);
    await expect(page.locator('main a[href^="https://wa.me/"]')).toBeVisible();
    await expect(page.locator('main a[href^="tel:"]')).toBeVisible();
    await expect(page.locator('main a[href^="mailto:"]')).toBeVisible();
    // Measure both columns in one frame: anchor smooth-scroll changes viewport y.
    const layout = await page.evaluate(() => {
      const form = document.querySelector("#on-gorusme")!.getBoundingClientRect();
      const channels = document.querySelector('main a[href^="https://wa.me/"]')!.getBoundingClientRect();
      return { formRight: form.right, formBottom: form.bottom, channelLeft: channels.left, channelTop: channels.top };
    });
    if (width > 1000) expect(layout.channelLeft).toBeGreaterThan(layout.formRight);
    else expect(layout.channelTop).toBeGreaterThan(layout.formBottom);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await expect(page.locator('script[src*="tally.so"]')).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}

for (const [slug, product] of [
  ["online-dershanem", "onlinedershanem"],
  ["online-kocum", "onlinekocum"],
  ["online-deneme-kulubum", "onlinedenemekulubum"],
]) {
  test(`${slug} consultation CTA retains product context and reaches public form`, async ({ page }) => {
    await page.goto(`/urunler/${slug}`);
    await page.getByRole("main").getByRole("link", { name: "Ücretsiz Ön Görüşme", exact: true }).first().click();
    await expect(page).toHaveURL(`/iletisim?urun=${product}#on-gorusme`);
    await expect(page.locator("#on-gorusme-title")).toBeInViewport({ timeout: 15_000 });
    await expect(page.getByTitle(title)).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Seçiminiz" })).toHaveCount(0);
  });
}

test("existing YKS one-to-one contact query retains context without sending hidden fields", async ({ page }) => {
  // Builder now uses the application form; existing contact-query links still work.
  const query = builderContactQuery({ exam: "YKS", dershanem: true, kocum: true,
    denemeKulubum: false, format: "birebir", subject: "Matematik", extraSubjects: ["Fizik"] });
  await page.goto(`/iletisim${query}#on-gorusme`);
  const selection = page.getByRole("complementary", { name: "Seçiminiz" });
  await expect(selection).toContainText("YKS · onlinedershanem. + onlinekoçum. × Yön Koçluk");
  await expect(selection).toContainText("Birebir · Matematik + Fizik");
  const iframeUrl = new URL((await page.getByTitle(title).getAttribute("src"))!);
  expect(iframeUrl.searchParams.has("paket")).toBe(false);
  expect(iframeUrl.searchParams.has("ref")).toBe(false);
});

test("only the matching iframe's trusted height message resizes the public form", async ({ page }) => {
  await page.goto("/iletisim#on-gorusme");
  const iframe = page.getByTitle(title);
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveCSS("height", "820px");
  await page.frameLocator(`iframe[title="${title}"]`).getByRole("textbox", { name: "Adınız" }).fill("Resize fixture");
  const frame = await (await iframe.elementHandle())!.contentFrame();
  await frame!.evaluate(() => parent.postMessage(JSON.stringify({ event: "Tally.FormHeight", payload: { formId: "0QpdQB", height: 1120 } }), "*"));
  await expect(iframe).toHaveCSS("height", "1120px");
  await frame!.evaluate(() => parent.postMessage({ event: "Tally.FormHeight", payload: { formId: "vGRQ5X", height: 99 } }, "*"));
  await page.evaluate(() => window.dispatchEvent(new MessageEvent("message", {
    origin: "https://tally.so", source: window,
    data: { event: "Tally.FormHeight", payload: { formId: "0QpdQB", height: 77 } },
  })));
  await expect(iframe).toHaveCSS("height", "1120px");
  await frame!.evaluate(() => parent.postMessage({ event: "Tally.FormHeight", payload: { formId: "0QpdQB", height: 1121 } }, "*"));
  await expect(iframe).toHaveCSS("height", "1121px");
  await expect(page.locator('script[src*="tally.so"]')).toHaveCount(0);
});
