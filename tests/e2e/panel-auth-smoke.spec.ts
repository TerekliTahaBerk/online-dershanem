import { expect, test } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { enterProductPanel, loginAs } from "./helpers/panel-login";

// Girişten sonra herkes önce ürün paneli seçicisini görür; seçilen panelin
// köküne gider. ODK öğrencisinin yalnız ODK paneli aktiftir.
const authSmokeMatrix = [
  { key: "admin", account: panelE2EAccounts.admin, expectedPath: /\/panel\/yonetim/, failureLabel: "PANEL ADMIN" },
  { key: "teacher", account: panelE2EAccounts.teacher, expectedPath: /\/panel\/ogretmen/, failureLabel: "PANEL TEACHER" },
  { key: "student", account: panelE2EAccounts.odkStudent, expectedPath: /\/panel\/odk\/ogrenci/, failureLabel: "ODK STUDENT" },
  { key: "parent", account: panelE2EAccounts.parent, expectedPath: /\/panel\/(veli|odk\/veli)/, failureLabel: "PANEL PARENT" },
] as const;

test.describe("panel auth smoke @panel-auth-smoke", () => {
  for (const item of authSmokeMatrix) {
    test(`${item.key} role can sign in via real login flow`, async ({ page }) => {
      await loginAs(
        page,
        {
          email: item.account.email,
          password: item.account.password,
          failureLabel: item.failureLabel,
        },
        { panel: null },
      );

      await page.waitForURL(/\/panel\/urun-sec$/);
      await expect(page.getByRole("heading", { name: "Hangi panele girmek istiyorsun?" })).toBeVisible();
      await enterProductPanel(page, "OD");
      await page.waitForURL(item.expectedPath);
      await expect(page.getByRole("main")).toBeVisible();
    });
  }
});
