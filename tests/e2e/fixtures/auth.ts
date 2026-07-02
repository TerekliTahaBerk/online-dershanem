import { test as base, expect, type Page } from "@playwright/test";

/**
 * Auth fixture'ları — E2E test kullanıcıları için login helper'ları.
 *
 * Kullanım:
 *   import { test, expect } from "../fixtures/auth";
 *   test("admin dashboard", async ({ adminPage }) => {
 *     await adminPage.goto("/panel/admin");
 *     await expect(adminPage.locator("h1")).toContainText(/admin|panel/i);
 *   });
 *
 * Önkoşul: `tsx prisma/seed-e2e.ts` ile test kullanıcıları DB'de mevcut olmalı.
 */

export const TEST_PASSWORD = process.env.E2E_PASSWORD || "testpass123";

export const TEST_USERS = {
  admin: "e2e-admin@onlinedershanem.test",
  ogrenci: "e2e-ogrenci@onlinedershanem.test",
  ogretmen: "e2e-ogretmen@onlinedershanem.test",
  veli: "e2e-veli@onlinedershanem.test",
} as const;

export type TestRole = keyof typeof TEST_USERS;

/**
 * Verilen e-posta/şifre ile login akışını yürütür.
 * Login sonrası /panel'e yönlendirildiğini doğrular.
 */
export async function loginAs(page: Page, email: string, password = TEST_PASSWORD): Promise<void> {
  await page.goto("/giris");
  await expect(page, "Giriş route'u bakım sayfasına veya beklenmeyen bir route'a yönlendi").toHaveURL(/\/giris\/?$/);

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  await expect(emailInput, "Giriş formunda e-posta alanı bulunamadı").toBeVisible();
  await expect(passwordInput, "Giriş formunda şifre alanı bulunamadı").toBeVisible();
  await emailInput.fill(email);
  await passwordInput.fill(password);
  await Promise.all([
    page.waitForURL(/\/panel(\/|$)/, { timeout: 15_000 }),
    page.locator('button[type="submit"]').click(),
  ]);
  await expect(page).toHaveURL(/\/panel/);
}

type AuthFixtures = {
  adminPage: Page;
  ogrenciPage: Page;
  ogretmenPage: Page;
  veliPage: Page;
};

export const test = base.extend<AuthFixtures>({
  adminPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USERS.admin);
    await use(page);
    await ctx.close();
  },
  ogrenciPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USERS.ogrenci);
    await use(page);
    await ctx.close();
  },
  ogretmenPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USERS.ogretmen);
    await use(page);
    await ctx.close();
  },
  veliPage: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await loginAs(page, TEST_USERS.veli);
    await use(page);
    await ctx.close();
  },
});

export { expect };
