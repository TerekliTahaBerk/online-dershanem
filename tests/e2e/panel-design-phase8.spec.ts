import { expect, test, type Page } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { loginAs } from "./helpers/panel-login";
import { accessibilityScan, describeViolations } from "./helpers/axe";
import { expectNoHorizontalOverflow } from "./helpers/responsive";

/**
 * DESIGN PHASE 8 — cila kapıları: 320–1440 genişlik taraması, azaltılmış
 * hareket, sekmeli ders alanı (klavye + sıfır axe ihlali) ve bölünmüş
 * Grup 360 / deneme çalışma alanı.
 */

const WIDTHS = [320, 768, 1024, 1440] as const;

const sweeps = [
  {
    key: "öğrenci",
    account: panelE2EAccounts.student,
    routes: ["/panel/ogrenci", "/panel/ogrenci/takvim", "/panel/ogrenci/odevler", "/panel/ogrenci/denemeler"],
  },
  {
    key: "öğretmen",
    account: panelE2EAccounts.teacher,
    routes: ["/panel/ogretmen", "/panel/ogretmen/ders/e2e-lesson", "/panel/ogretmen/ogrenciler", "/panel/ogretmen/denemeler"],
  },
  {
    key: "veli",
    account: panelE2EAccounts.parent,
    routes: ["/panel/veli", "/panel/veli/odevler", "/panel/veli/kocluk", "/panel/odk/veli/raporlar"],
  },
  {
    key: "yönetici",
    account: panelE2EAccounts.admin,
    routes: ["/panel/yonetim", "/panel/yonetim/kisiler", "/panel/yonetim/gruplar/e2e-group", "/panel/yonetim/denemeler"],
  },
] as const;

async function expectZeroViolations(page: Page, label: string) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity),
  );
  const result = await accessibilityScan(page).analyze();
  expect(result.violations, `${label} erişilebilirlik ihlalleri:\n${describeViolations(result.violations)}`).toEqual([]);
}

test.describe("Design Phase 8 — cila kapıları", () => {
  test.skip(!panelE2EAccounts.admin.password, "Panel E2E parolası tanımlı değil.");

  for (const sweep of sweeps) {
    test(`${sweep.key}: 320–1440 arası yatay taşma yok`, async ({ page }) => {
      test.setTimeout(60_000 + sweep.routes.length * WIDTHS.length * 6_000);
      await loginAs(page, { ...sweep.account, failureLabel: sweep.key });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        for (const route of sweep.routes) {
          await test.step(`${route} @${width}`, async () => {
            await page.goto(route, { waitUntil: "domcontentloaded" });
            await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
            await expectNoHorizontalOverflow(page, `${route} @${width}`);
          });
        }
      }
    });
  }

  test("azaltılmış harekette panelde süren animasyon yok", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, { ...panelE2EAccounts.admin, failureLabel: "ADMIN" });
    for (const route of ["/panel/yonetim", "/panel/yonetim/kisiler", "/panel/yonetim/gruplar/e2e-group"]) {
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
      const running = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((animation) => animation.playState === "running")
          .map((animation) => (animation.effect as KeyframeEffect | null)?.target?.nodeName ?? "?"),
      );
      expect(running, `${route} azaltılmış harekette animasyon`).toEqual([]);
    }
  });

  test("ders alanı sekmeleri klavyeyle gezilir ve her sekme sıfır ihlalle geçer", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, { ...panelE2EAccounts.teacher, failureLabel: "TEACHER" });
    await page.goto("/panel/ogretmen/ders/e2e-lesson?sekme=hazirlik");
    const tabs = page.getByRole("tablist", { name: "Ders alanı bölümleri" });
    await expect(tabs.getByRole("tab", { name: "Hazırlık" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "Önceki ders" })).toBeVisible();
    await expectZeroViolations(page, "Ders · Hazırlık");

    await tabs.getByRole("tab", { name: "Hazırlık" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.getByRole("tab", { name: /^Ders/ })).toBeFocused();
    await expect(page).toHaveURL(/sekme=ders/);
    await expect(page.getByRole("heading", { name: "Yoklama" })).toBeVisible();
    await expectZeroViolations(page, "Ders · Ders");

    await page.keyboard.press("End");
    await expect(tabs.getByRole("tab", { name: "Kapanış" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("textbox", { name: "Gruba ortak kısa not" })).toBeVisible();
    // Kapanış çubuğu her sekmede görünür.
    await expect(page.getByRole("button", { name: /Dersi güvenle kapat|Dersi tamamla|Ders tamamlandı/ })).toBeVisible();
    await expectZeroViolations(page, "Ders · Kapanış");
  });

  test("Grup 360 ve deneme çalışma alanı masaüstünde sıfır ihlal", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, { ...panelE2EAccounts.admin, failureLabel: "ADMIN" });
    await page.goto("/panel/yonetim/gruplar/e2e-group");
    await expect(page.getByRole("navigation", { name: "Grup 360 sekmeleri" })).toBeVisible();
    await expectZeroViolations(page, "Grup 360 genel");
    await page.goto("/panel/yonetim/gruplar/e2e-group?sekme=ogrenciler");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectZeroViolations(page, "Grup 360 öğrenciler");
    await page.goto("/panel/yonetim/denemeler");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectZeroViolations(page, "Denemeler");
  });
});
