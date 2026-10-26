import { expect, test } from "@playwright/test";

const consentKey = "od_ga_consent_v1";
const tagUrl = "**/www.googletagmanager.com/gtag/js*";

test.beforeEach(async ({ page }) => {
  // No QA traffic reaches Google's collection endpoints or the live property.
  await page.route("**/*.google-analytics.com/**", route => route.abort());
  await page.route(tagUrl, route => route.fulfill({ contentType: "application/javascript", body: "/* GA SDK stub: no network collection */" }));
});

test("no tag before consent; rejection survives reload and can be changed", async ({ page }) => {
  await page.goto("/");
  const banner = page.getByRole("region", { name: "Google Analytics tercihi", exact: true });
  await expect(banner).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com/gtag"]')).toHaveCount(0);
  await banner.getByRole("button", { name: "Hayır", exact: true }).click();
  await expect(banner).toHaveCount(0);
  await page.reload();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Analitik tercihini değiştir", exact: true })).toHaveCount(0);
  await expect(page.locator('script[src*="googletagmanager.com/gtag"]')).toHaveCount(0);
  await page.getByRole("link", { name: "Gizlilik", exact: true }).click();
  await page.getByRole("button", { name: "Analitik tercihini değiştir", exact: true }).click();
  await expect(banner).toBeVisible();
});

test("opt-in loads once, sanitizes events, counts clicks rather than leads, and withdrawal unloads", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/urunler/online-kocum?email=private@example.com&utm_campaign=private-name#private-token");
  await page.getByRole("button", { name: "Evet", exact: true }).click();
  await expect(page.locator('script[src*="googletagmanager.com/gtag"]')).toHaveCount(1);
  await expect(page.getByRole("region", { name: "Google Analytics tercihi", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Analitik tercihini değiştir", exact: true })).toHaveCount(0);
  const messages = () => page.evaluate(() => (window.dataLayer ?? []).map(value => Array.from(value as ArrayLike<unknown>)));
  await expect.poll(async () => (await messages()).filter(row => row[0] === "event" && row[1] === "page_view").length).toBe(1);
  const data = await messages();
  expect(data.find(row => row[0] === "config")?.[1]).toBe("G-M8XHNBR1E6");
  expect(JSON.stringify(data)).not.toMatch(/private|email|utm_campaign/);
  expect(data.find(row => row[0] === "consent" && row[1] === "default")?.[2]).toMatchObject({ analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  await page.route("https://tally.so/**", route => route.abort());
  const application = page.locator('main a[href*="tally.so/r/QK6MYp"]').first();
  // Keep the current document available to inspect the click's payload.
  await application.evaluate(anchor => anchor.addEventListener("click", event => event.preventDefault()));
  await application.click();
  await expect.poll(async () => (await messages()).filter(row => row[1] === "application_click").length).toBe(1);
  expect(JSON.stringify(await messages())).not.toMatch(/generate_lead|form_submit/);
  await context.addCookies([{ name: "_ga", value: "test-only", url: new URL(page.url()).origin }]);
  await page.getByRole("link", { name: "Gizlilik", exact: true }).click();
  await page.getByRole("button", { name: "Analitik tercihini değiştir", exact: true }).click();
  await page.getByRole("button", { name: "Hayır", exact: true }).click();
  await expect(page.locator('script[src*="googletagmanager.com/gtag"]')).toHaveCount(0);
  expect((await context.cookies()).some(cookie => cookie.name === "_ga")).toBe(false);
  expect(errors).toEqual([]);
});

test("SPA navigation produces one page view per public page and stops on login", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Evet", exact: true }).click();
  const views = () => page.evaluate(() => (window.dataLayer ?? []).map(value => Array.from(value as ArrayLike<unknown>)).filter(row => row[0] === "event" && row[1] === "page_view"));
  await expect.poll(async () => (await views()).length).toBe(1);
  await page.getByRole("navigation", { name: "Ürünlere hızlı erişim", exact: true }).getByRole("link", { name: "Yön Koçluk", exact: true }).click();
  await expect(page).toHaveURL(/\/urunler\/online-kocum$/);
  await expect.poll(async () => (await views()).length).toBe(2);
  await page.getByRole("link", { name: "Giriş Yap", exact: true }).click();
  await expect(page).toHaveURL(/\/giris/);
  expect((await views()).length).toBe(2);
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>)["ga-disable-G-M8XHNBR1E6"])).toBe(true);
});

test("a remembered grant never loads GA on authentication pages", async ({ page }) => {
  await page.addInitScript(({ consentKey }) => localStorage.setItem(consentKey, JSON.stringify({ choice: "granted", expiresAt: Date.now() + 86400000 })), { consentKey });
  await page.goto("/giris?email=private@example.com");
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator('script[src*="googletagmanager.com/gtag"]')).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Google Analytics tercihi", exact: true })).toHaveCount(0);
});

test("withdrawal stays disabled when browser storage cannot save the new choice", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Evet", exact: true }).click();
  await expect.poll(() => page.evaluate(() => Boolean(window.gtag))).toBe(true);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error("Storage unavailable"); }; });
  await page.getByRole("link", { name: "Gizlilik", exact: true }).click();
  await page.getByRole("button", { name: "Analitik tercihini değiştir", exact: true }).click();
  await page.getByRole("button", { name: "Hayır", exact: true }).click();
  await expect(page.getByRole("region", { name: "Google Analytics tercihi", exact: true }).getByRole("alert")).toContainText("bu sayfada kapalı");
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>)["ga-disable-G-M8XHNBR1E6"])).toBe(true);
});

test("mobile consent choices fit without horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Hayır", exact: true })).toBeInViewport();
  await expect(page.getByRole("button", { name: "Evet", exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
