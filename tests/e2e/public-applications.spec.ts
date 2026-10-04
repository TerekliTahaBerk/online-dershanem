import { expect, test } from "@playwright/test";
import { application } from "../../lib/application";

test("kayıt API’si hesap oluşturmayı reddeder", async ({ request }) => {
  // Geçersiz JSON bile işlenmeden reddedilir; hiçbir kullanıcı verisi yazılmaz.
  const response = await request.post("/api/auth/register", {
    data: "not-json",
    headers: { "content-type": "application/json" },
  });
  expect(response.status()).toBe(503);
  expect(await response.json()).toEqual({ error: "Kayıt şu anda kapalı." });
});

test("eski kayıt adresi başvuru formuna gider", async ({ page }) => {
  await page.route("https://tally.so/**", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Başvuru formu</h1>" }));
  await page.goto("/kayit");
  await expect(page).toHaveURL(application.href);
});

test("Deneme Ligi başvurusu aynı formu açar", async ({ page }) => {
  await page.goto("/urunler/online-deneme-kulubum");
  const links = page.getByRole("link", { name: "Lige Başvur", exact: true });
  await expect(links).toHaveCount(3);
  for (const link of await links.all()) await expect(link).toHaveAttribute("href", application.href);
});

for (const width of [375, 768, 1440]) {
  test(`başvuru ve Deneme Ligi fiyatı ${width}px genişlikte taşmaz`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/paketler");
    const league = page.getByRole("button", { name: /onlinedenemekulübüm.*Deneme Ligi/ });
    await expect(league).toBeVisible();
    await league.click();
    const summary = page.getByRole("complementary", { name: "Paket özeti" });
    await expect(summary.getByRole("link", { name: "Başvur", exact: true })).toHaveAttribute("href", application.href);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
}
