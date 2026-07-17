import { expect, test, type Page } from "@playwright/test";

const accounts = [
  { role: "admin", email: process.env.PANEL_E2E_ADMIN_EMAIL, password: process.env.PANEL_E2E_ADMIN_PASSWORD, path: "/panel/yonetim" },
  { role: "teacher", email: process.env.PANEL_E2E_TEACHER_EMAIL, password: process.env.PANEL_E2E_TEACHER_PASSWORD, path: "/panel/ogretmen" },
  { role: "student", email: process.env.PANEL_E2E_STUDENT_EMAIL, password: process.env.PANEL_E2E_STUDENT_PASSWORD, path: "/panel/ogrenci" },
  { role: "parent", email: process.env.PANEL_E2E_PARENT_EMAIL, password: process.env.PANEL_E2E_PARENT_PASSWORD, path: "/panel/veli" },
];

async function login(page: Page, email: string, password: string) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `cross-browser-${email}-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  await page.goto("/giris");
  await expect(page.getByRole("button", { name: /^Giriş yap$/ })).toBeEnabled();
  await page.getByRole("textbox", { name: "E-posta" }).fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
}

test.describe("çapraz tarayıcı panel kabulü", () => {
  test.skip(!accounts.every((account) => account.email && account.password), "Panel E2E hesapları tanımlı değil.");
  for (const account of accounts) test(`${account.role} paneli açılır ve yatay taşmaz`, async ({ page }) => {
    await login(page, account.email!, account.password!);
    await page.waitForURL(new RegExp(`${account.path}$`));
    await expect(page.getByRole("main")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  });
});
