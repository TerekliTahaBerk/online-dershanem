import { test, expect } from "@playwright/test";

/**
 * Sepet / satın alma akışı — public, login gerektirmez, DB yazmaz.
 *
 * Kapsam: boş /sepet server-render fallback'i ("Sepetin boş") gösterir.
 */
test.describe("Sepet satın alma akışı @smoke", () => {
  test("boş /sepet server fallback'i gösterir", async ({ page }) => {
    await page.goto("/sepet", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: /sepetin boş/i }),
    ).toBeVisible();
    // Boş sepet, paket kurucuya yönlendirir.
    await expect(
      page.getByRole("link", { name: "Paketini Oluştur" }).last(),
    ).toHaveAttribute("href", "/paketler");
  });
});
