import { expect, test } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { loginAs } from "./helpers/panel-login";

const authSmokeMatrix = [
  { key: "admin", account: panelE2EAccounts.admin, expectedPath: "/panel/yonetim", failureLabel: "PANEL ADMIN" },
  { key: "teacher", account: panelE2EAccounts.teacher, expectedPath: "/panel/ogretmen", failureLabel: "PANEL TEACHER" },
  { key: "student", account: panelE2EAccounts.odkStudent, expectedPath: "/panel/ogrenci", failureLabel: "ODK STUDENT" },
  { key: "parent", account: panelE2EAccounts.parent, expectedPath: "/panel/veli", failureLabel: "PANEL PARENT" },
] as const;

test.describe("panel auth smoke", () => {
  for (const item of authSmokeMatrix) {
    test(`${item.key} role can sign in via real login flow`, async ({ page }) => {
      await loginAs(page, {
        email: item.account.email,
        password: item.account.password,
        failureLabel: item.failureLabel,
      });

      await page.waitForURL(new RegExp(item.expectedPath.replaceAll("/", "\\/")));
      await expect(page.getByRole("main")).toBeVisible();
    });
  }
});
