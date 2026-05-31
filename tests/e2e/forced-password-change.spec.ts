/**
 * Phase 3 / Session 12 — D2: Forced password change E2E.
 *
 * Senaryo:
 *   1. e2e-veli'nin DB'de mustChangePassword=true + bilinen şifresi var
 *   2. Login → /panel/sifre-degistir redirect (middleware.ts:59)
 *   3. /panel/veli erişimi → yine /panel/sifre-degistir
 *   4. Form submit → /panel/veli
 *   5. DB'de mustChangePassword=false
 *
 * Test sonunda flag + şifre orijinal seed haline döner.
 */
import { test, expect, TEST_USERS, TEST_PASSWORD } from "./fixtures/auth";
import { testPrisma } from "./helpers/db";
import bcrypt from "bcryptjs";

// NOT @smoke — bcrypt hashing + multi-step form, slow. Smoke covers
// `role-routing.spec.ts > mustChangePassword` redirect gate.
test.describe("D2 — Forced password change", () => {
  test("mustChangePassword=true → /panel/sifre-degistir; submit sonrası flag temizlenir", async ({ page }) => {
    const email = TEST_USERS.veli;
    const tempPassword = `${TEST_PASSWORD}-tmp`;
    const newPassword = `${TEST_PASSWORD}-changed`;

    // Setup: bilinen geçici şifre + flag
    const tempHash = await bcrypt.hash(tempPassword, 10);
    await testPrisma.user.update({
      where: { email },
      data: { passwordHash: tempHash, mustChangePassword: true },
    });

    try {
      // Step 1: login geçici şifre ile
      await page.goto("/giris");
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(tempPassword);
      await page.locator('button[type="submit"]').click();

      // Step 2: yönlendirme → /panel/sifre-degistir (login → /panel → middleware redirect)
      await page.waitForURL(/\/panel\/sifre-degistir/, { timeout: 10_000 });

      // Step 3: rol paneline gitmeyi dene → yine /panel/sifre-degistir
      await page.goto("/panel/veli");
      await page.waitForURL(/\/panel\/sifre-degistir/, { timeout: 10_000 });

      // Step 4: form doldur — current + new + confirm
      await page.locator('input[autocomplete="current-password"]').fill(tempPassword);
      const newPwInputs = page.locator('input[autocomplete="new-password"]');
      await newPwInputs.nth(0).fill(newPassword);
      await newPwInputs.nth(1).fill(newPassword);
      await page.locator('button[type="submit"]').click();

      // Step 5: rol paneline yönleniyor
      await page.waitForURL(/\/panel\/veli/, { timeout: 10_000 });

      // Step 6: DB'de flag temizlendi
      const after = await testPrisma.user.findUniqueOrThrow({
        where: { email },
        select: { mustChangePassword: true },
      });
      expect(after.mustChangePassword).toBe(false);
    } finally {
      // Cleanup: orijinal seed parolasına geri dön + flag false
      const seedHash = await bcrypt.hash(TEST_PASSWORD, 10);
      await testPrisma.user.update({
        where: { email },
        data: { passwordHash: seedHash, mustChangePassword: false },
      });
    }
  });
});
