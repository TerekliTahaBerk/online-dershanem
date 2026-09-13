import { expect, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./client-ip";

export type PanelLoginFixture = {
  email: string;
  password: string;
  failureLabel: string;
};

export async function loginAs(page: Page, fixture: PanelLoginFixture): Promise<void> {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await expect(page.getByRole("button", { name: /^Giriş Yap$/ })).toBeEnabled();
  await page.getByRole("textbox", { name: "E-posta" }).fill(fixture.email);
  await page.getByLabel("Şifre").fill(fixture.password);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click();

  const invalidCredentialAlert = page.getByRole("alert").filter({ hasText: "E-posta veya parola hatalı." });
  await Promise.race([
    page.waitForURL(/\/panel\//, { timeout: 20_000 }),
    invalidCredentialAlert.waitFor({ state: "visible", timeout: 20_000 }).then(async () => {
      const detail = await invalidCredentialAlert.first().innerText();
      throw new Error(`${fixture.failureLabel} E2E login failed for configured fixture. Check seed/database/environment alignment. ${detail}`);
    }),
  ]);
}
