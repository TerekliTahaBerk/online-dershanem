import { expect, test, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./helpers/client-ip";

const accounts = [
  { role: "admin", email: process.env.PANEL_E2E_ADMIN_EMAIL, password: process.env.PANEL_E2E_ADMIN_PASSWORD, path: "/panel/yonetim" },
  { role: "teacher", email: process.env.PANEL_E2E_TEACHER_EMAIL, password: process.env.PANEL_E2E_TEACHER_PASSWORD, path: "/panel/ogretmen" },
  { role: "student", email: process.env.PANEL_E2E_STUDENT_EMAIL, password: process.env.PANEL_E2E_STUDENT_PASSWORD, path: "/panel/ogrenci" },
  { role: "parent", email: process.env.PANEL_E2E_PARENT_EMAIL, password: process.env.PANEL_E2E_PARENT_PASSWORD, path: "/panel/veli" },
];

async function login(page: Page, email: string, password: string) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await expect(page.getByRole("button", { name: /^Giriş yap$/ })).toBeEnabled();
  await page.getByRole("textbox", { name: "E-posta" }).fill(email);
  await page.getByLabel("Parola").fill(password);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
  await page.waitForURL(/\/panel\//);
  if (new URL(page.url()).pathname === "/panel/urun-sec") {
    await page.getByRole("link", { name: "Online Dershanem paneline git" }).click();
  }
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
