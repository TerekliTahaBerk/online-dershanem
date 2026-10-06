import { expect, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./client-ip";

export type PanelLoginFixture = {
  email: string;
  password: string;
  failureLabel: string;
};

export type PanelChoice = "OD" | "OK" | "ODK";

const PANEL_LINK_NAME: Record<PanelChoice, string> = {
  OD: "onlinedershanem. paneline git",
  OK: "onlinekoçum. × Yön Koçluk paneline git",
  ODK: "onlinedenemekulübüm. × Deneme Ligi paneline git",
};

/**
 * Girişten sonra ürün paneli seçicisi (`/panel/urun-sec`) açılır. İstenen ürün
 * kartı aktifse ona, değilse ilk aktif ürüne girer ve yönlendirme bitene kadar
 * bekler (kart önce seçimi kaydeder, sonra gider). Aktif ürünü olmayan
 * kullanıcı seçicide kalır. Seçici yoksa (parola değiştirme, MFA) dokunmaz.
 */
export async function enterProductPanel(page: Page, preferred: PanelChoice = "OD"): Promise<void> {
  if (new URL(page.url()).pathname !== "/panel/urun-sec") return;
  await expect(page.getByRole("heading", { name: "Hangi panele girmek istiyorsun?" })).toBeVisible();
  const wanted = page.getByRole("link", { name: PANEL_LINK_NAME[preferred] });
  const anyActive = page.getByRole("link", { name: / paneline git$/ });
  const target = (await wanted.count()) > 0 ? wanted : (await anyActive.count()) > 0 ? anyActive.first() : null;
  if (!target) return;
  await target.click();
  await page.waitForURL((url) => url.pathname !== "/panel/urun-sec", { timeout: 20_000 });
  await page.waitForLoadState("load");
}

export async function loginAs(
  page: Page,
  fixture: PanelLoginFixture,
  options: { panel?: PanelChoice | null } = {},
): Promise<void> {
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
  if (options.panel !== null) await enterProductPanel(page, options.panel ?? "OD");
}
