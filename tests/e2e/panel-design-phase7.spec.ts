import { expect, test, type Page } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { loginAs } from "./helpers/panel-login";
import { accessibilityScan } from "./helpers/axe";

/**
 * DESIGN PHASE 7 — veli: başlıktaki öğrenci bağlamı (§9.7), sakin Bugün,
 * salt okunur ödev/öğretmen tabloları ve Deneme Ligi sade raporu (§11.7).
 */

const parent = { ...panelE2EAccounts.parent, failureLabel: "PARENT" };

async function expectNoBlockingA11y(page: Page, label: string) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity),
  );
  const results = await accessibilityScan(page).analyze();
  const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
  expect(blocking, `${label} erişilebilirlik ihlalleri`).toEqual([]);
}

test.describe("Design Phase 7 — veli", () => {
  test.skip(!parent.password, "Panel E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });

  test("Bugün öğrenci bağlamını başlıkta gösterir; metrik kartı yok", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, parent);
    await page.goto("/panel/veli");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Bugün", level: 1 })).toBeVisible();
    await expect(main.getByText("Öğrenci:", { exact: false }).first()).toBeVisible();
    await expect(main.getByRole("heading", { name: "Sizden beklenen" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Bu hafta" })).toBeVisible();
    await expect(main.locator(".panel-metric-card")).toHaveCount(0);
    await expectNoBlockingA11y(page, "Veli Bugün");
  });

  for (const viewport of [
    { name: "masaüstü", width: 1440, height: 900 },
    { name: "mobil", width: 390, height: 844 },
  ] as const) {
    test(`ödev ve öğretmen ekranları salt okunur tablodur (${viewport.name})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loginAs(page, parent);
      for (const [path, heading] of [
        ["/panel/veli/odevler", "Ödev"],
        ["/panel/veli/ogretmenler", "Öğretmenler"],
      ] as const) {
        await page.goto(path);
        const main = page.getByRole("main");
        await expect(main.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
        await expect(main.getByText("Öğrenci:", { exact: false }).first()).toBeVisible();
        // Veli düzenlemez: tabloda form ya da gönder düğmesi yok.
        await expect(main.locator("form")).toHaveCount(0);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `${path} yatay taşma`).toBeLessThanOrEqual(1);
        await expectNoBlockingA11y(page, `${path} ${viewport.name}`);
      }
    });
  }

  test("Deneme Ligi veli ana sayfası ve raporu sıralama göstermez", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, parent);
    await page.goto("/panel/odk/veli");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Deneme Ligi", level: 1 })).toBeVisible();
    await expect(main.locator(".panel-metric-card")).toHaveCount(0);
    await expectNoBlockingA11y(page, "DL veli ana sayfa");

    await page.goto("/panel/odk/veli/raporlar");
    await expect(main.getByRole("heading", { name: "Deneme raporu", level: 1 })).toBeVisible();
    await expect(main.getByRole("columnheader", { name: /Sıra|Yüzdelik/ })).toHaveCount(0);
    await expectNoBlockingA11y(page, "DL veli raporu");
  });
});
