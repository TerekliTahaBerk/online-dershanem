import { expect, test } from "@playwright/test";

const images = ["/paketler/opengraph-image", "/odk-paketleri/opengraph-image"];

test("package builder shares the current ecosystem image in OG and Twitter", async ({ page }) => {
  await page.goto("/paketler");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/paketler\/opengraph-image/);
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute("content", /\/paketler\/opengraph-image/);
  await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute("content", /Paketini Oluştur/);
});

test("social images return real 1200 by 630 PNGs and orphan images return 404", async ({ request }) => {
  for (const image of images) {
    const response = await request.get(image);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/png");
    const png = await response.body();
    expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  }
  for (const route of ["/tyt/opengraph-image", "/ayt/opengraph-image"]) {
    expect((await request.get(route, { maxRedirects: 0 })).status()).toBe(404);
  }
});

test("unverified deneme checkout result uses Deneme Ligi and stays noindex", async ({ page }) => {
  // No orderId: exercises the presentation fallback without looking up or creating an order.
  await page.goto("/odk-paketleri/metadata-check/satin-al/sonuc?status=failed");
  await expect(page).toHaveTitle(/Ödeme Sonucu · Deneme Ligi/);
  await expect(page.getByRole("main")).toContainText("Deneme Ligi");
  await expect(page.getByRole("main")).not.toContainText("ODK");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
