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
    await page.goto("/matematik-ders-paketi/", {
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
});
