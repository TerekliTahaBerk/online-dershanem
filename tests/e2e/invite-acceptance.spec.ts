/**
 * Phase 3 / Session 12 — D1: Invite acceptance E2E.
 *
 * Doğrudan Prisma ile geçici bir User + `userInviteToken` yaratıyoruz
 * (mirror of `regenerateUserInvite` shape — hızlı setup, product code
 * bypass'ı yok çünkü `/davet/[token]` page'i token'ı kendi başına
 * `validateInviteToken` ile doğruluyor).
 *
 * Cleanup test başında ve sonunda yapılır (paralel çalışmadığı varsayılıyor;
 * `playwright.config.ts > fullyParallel=true` ama her test kendi unique
 * email'ini kullandığı için paralel-safe).
 */
import { test, expect, TEST_PASSWORD } from "./fixtures/auth";
import { testPrisma } from "./helpers/db";
import { randomBytes } from "node:crypto";

function uniqueEmail(suffix: string) {
  const r = randomBytes(4).toString("hex");
  return `e2e-invite-${suffix}-${r}@onlinedershanem.test`;
}

function generateToken() {
  return randomBytes(24).toString("base64url");
}

// NOT @smoke — DB write heavy + multi-step UI form. Smoke set covers
// `role-routing.spec.ts` for login flow; full E2E covers invite path.
test.describe("D1 — Invite acceptance", () => {
  test("davet token ile şifre belirleyip giriş yapılabiliyor; reuse engelli", async ({ page }) => {
    const email = uniqueEmail("ok");
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const newPassword = `${TEST_PASSWORD}-new1`;

    // Setup: User + Student profile (rol=STUDENT → davet sonrası /panel/ogrenci).
    const user = await testPrisma.user.create({
      data: {
        email,
        name: "E2E Invite User",
        role: "STUDENT",
        passwordHash: null,
        userInviteToken: token,
        userInviteTokenExpiresAt: expiresAt,
      },
    });
    const phone = `+9050100${String(Date.now()).slice(-7)}`;
    await testPrisma.student.create({
      data: {
        userId: user.id,
        fullName: "E2E Invite User",
        email,
        phone,
        phoneKey: phone.replace(/\D/g, ""),
      },
    });

    try {
      // Step 1: davet sayfası açılıyor + form render
      await page.goto(`/davet/${token}`);
      await expect(page.locator("body")).toContainText(/aktif|şifre|hoş geldiniz/i);
      const newPwInputs = page.locator('input[autocomplete="new-password"]');
      await expect(newPwInputs).toHaveCount(2);

      // Step 2: yeni şifre belirle
      await newPwInputs.nth(0).fill(newPassword);
      await newPwInputs.nth(1).fill(newPassword);
      await page.locator('button[type="submit"]').click();

      // Step 3: redirect → /giris?callbackUrl=...
      await page.waitForURL(/\/giris/, { timeout: 10_000 });
      expect(page.url()).toMatch(/callbackUrl/);

      // Step 4: yeni şifreyle login
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(newPassword);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/panel\//, { timeout: 10_000 });
      // STUDENT → /panel/ogrenci
      await expect(page).toHaveURL(/\/panel\/ogrenci/);

      // Step 5: token DB'de temizlendi
      const after = await testPrisma.user.findUniqueOrThrow({
        where: { id: user.id },
        select: { userInviteToken: true, passwordHash: true },
      });
      expect(after.userInviteToken).toBeNull();
      expect(after.passwordHash).toBeTruthy();

      // Step 6: aynı token ile tekrar dene → "Bağlantı geçersiz"
      const ctx = await page.context().browser()!.newContext();
      const fresh = await ctx.newPage();
      await fresh.goto(`/davet/${token}`);
      await expect(fresh.locator("body")).toContainText(/geçersiz|süresi dolmuş/i);
      await ctx.close();
    } finally {
      // Cleanup
      await testPrisma.user.delete({ where: { id: user.id } }).catch(() => {});
    }
  });
});
