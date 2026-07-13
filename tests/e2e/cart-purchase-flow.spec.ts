import { test, expect } from "@playwright/test";

/**
 * Sepet / satın alma akışı — public, login gerektirmez, DB yazmaz.
 *
 * Kapsam:
 *  1) Boş /sepet server-render fallback'i ("Sepetiniz boş") gösterir.
 *  2) "Satın Al" ürünü sepete ekler ve /sepet sipariş özetinde gösterir.
 */
test.describe("Sepet satın alma akışı @smoke", () => {
  test("boş /sepet server fallback'i gösterir", async ({ page }) => {
    await page.goto("/sepet", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /sepetiniz boş/i }),
    ).toBeVisible();
    // Boş sepet, ürün sayfasına yönlendirir.
    await expect(page.locator("body")).toContainText(/matematik ders paketi/i);
  });

  test("Satın Al → ürün sepete eklenir → /sepet özetinde görünür", async ({
    page,
  }) => {
    await page.goto("/ders-paketleri/", {
      waitUntil: "domcontentloaded",
    });

    // PurchaseFunnelTrigger bir <a href="/sepet"> + onClick'tir; hidrasyon
    // tamamlanmadan tıklanırsa düz href takip edilir (sepete eklemeden).
    // React onClick'i bağladığında DOM düğümüne __reactProps$ ekler — bunu
    // bekleyerek tıklamanın SPA add-to-cart davranışını garanti ederiz.
    const cta = page.locator("a[data-package-name]").first();
    await cta.waitFor({ state: "visible" });
    await page.waitForFunction(() => {
      const a = document.querySelector("a[data-package-name]");
      return !!a && Object.keys(a).some((k) => k.startsWith("__reactProps$"));
    });
    await cta.click();

    await page.waitForURL(/\/sepet(\/|\?|$)/);
    await expect(
      page.getByRole("heading", { name: /sipariş özeti/i }),
    ).toBeVisible();
    await expect(
      page.getByText(/matematik ders paketi/i).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /güvenli ödemeye geç/i }),
    ).toBeVisible();
  });

  for (const category of ["LGS", "YKS"] as const) {
    test(`${category} CTA doğru katalog kimliğini sepete yazar`, async ({ page }) => {
      await page.goto("/ders-paketleri/", { waitUntil: "domcontentloaded" });
      const cta = page.locator(`a[data-package-name^="${category}"]`).first();
      await cta.waitFor({ state: "visible" });
      await page.waitForFunction((name) => {
        const a = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-package-name]")).find((item) => item.dataset.packageName?.startsWith(name));
        return !!a && Object.keys(a).some((key) => key.startsWith("__reactProps$"));
      }, category);
      await cta.click();
      await page.waitForURL(/\/sepet/);
      const item = await page.evaluate(() => JSON.parse(localStorage.getItem("od_cart_v1") || "[]")[0]);
      expect(item).toMatchObject({ category, subject: "Matematik Ders Paketi", priceCents: 300000, qty: 1 });
    });
  }
});
