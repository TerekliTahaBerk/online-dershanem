/**
 * Phase 3 / Session 11 — D4: Role routing & lockout.
 *
 * `panel-flows.spec.ts` rol → panel landing'lerini zaten kapsıyor.
 * Bu dosya tamamlayıcı kenar durumları test eder:
 *   - accountDisabledAt set olduğunda login reddediliyor
 *   - mustChangePassword=true kullanıcı `/panel/sifre-degistir`a yönleniyor
 *
 * Test sonunda flag'ler temizlenir (idempotent).
 */
import { test, expect, loginAs, TEST_USERS, TEST_PASSWORD } from "./fixtures/auth";
import { testPrisma } from "./helpers/db";

test.describe("D4 — Role routing & lockout @smoke", () => {
  test("disabled hesap login olamaz, /giris'te kalır", async ({ page }) => {
    // Setup: admin'i geçici olarak disable et — zarar vermesin diye admin'i tercih
    // etmiyoruz; öğrenciyi devre dışı bırakıyoruz.
    const email = TEST_USERS.ogrenci;
    await testPrisma.user.update({
      where: { email },
      data: { accountDisabledAt: new Date() },
    });

    try {
      await page.goto("/giris");
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(TEST_PASSWORD);
      await page.locator('button[type="submit"]').click();

      // Login fail → /giris'te kal (panel'e yönlenmemeli)
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/giris/);
      // Panel'e geçmediğini doğrula
      await expect(page).not.toHaveURL(/\/panel\//);
    } finally {
      // Cleanup
      await testPrisma.user.update({
        where: { email },
        data: { accountDisabledAt: null },
      });
    }
  });

  test("mustChangePassword=true kullanıcı /panel/sifre-degistir'e yönlenir", async ({ page }) => {
    const email = TEST_USERS.ogretmen;
    await testPrisma.user.update({
      where: { email },
      data: { mustChangePassword: true },
    });

    try {
      await loginAs(page, email);
      // Login başarılı, ama bir panel sayfasına gittiğimizde force-pw redirect
      await page.goto("/panel/ogretmen");
      await page.waitForLoadState("networkidle");
      await expect(page).toHaveURL(/\/panel\/sifre-degistir/);
    } finally {
      await testPrisma.user.update({
        where: { email },
        data: { mustChangePassword: false },
      });
    }
  });
});
