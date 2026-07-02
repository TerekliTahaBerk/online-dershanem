import { expect, test } from "@playwright/test";

const cartSnapshot = {
  items: [
    {
      id: "TYT-AYT__Ders Paketi",
      name: "Matematik Ders Paketi",
      category: "TYT-AYT",
      subject: "Ders Paketi",
      priceCents: 300000,
      priceLabel: "₺3.000 / ay",
      qty: 1,
    },
  ],
  coupon: null,
  ts: Date.now(),
};

test("blank checkout shows field errors, focuses the first field and does not submit", async ({ page }) => {
  await page.goto("/sepet");
  await page.evaluate((snapshot) => {
    localStorage.setItem("od_checkout_cart", JSON.stringify(snapshot));
  }, cartSnapshot);

  await page.goto("/sepet/satin-al");
  const startRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/od/checkout/start")) startRequests.push(request.url());
  });

  await page.getByRole("button", { name: "Güvenli Ödemeye Geç →" }).click();

  await expect(page.locator("#fullName-error")).toContainText("Bu alan gerekli");
  await expect(page.locator("#fullName")).toBeFocused();
  expect(startRequests).toHaveLength(0);
});

test("cart is preserved until an explicit payment success result", async ({ page }) => {
  await page.goto("/sepet");
  await page.evaluate((snapshot) => {
    localStorage.setItem("od_cart_v1", JSON.stringify(snapshot.items));
    localStorage.setItem("od_checkout_cart", JSON.stringify(snapshot));
  }, cartSnapshot);

  await page.goto("/paketler/satin-al/sonuc?status=failed");
  expect(await page.evaluate(() => localStorage.getItem("od_cart_v1"))).not.toBeNull();

  await page.goto("/paketler/satin-al/sonuc?status=success");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const raw = localStorage.getItem("od_cart_v1");
        return raw === null || JSON.parse(raw).length === 0;
      }),
    )
    .toBe(true);
  expect(await page.evaluate(() => localStorage.getItem("od_checkout_cart"))).toBeNull();
});
