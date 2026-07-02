import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const routes = ["/", "/matematik-ders-paketi", "/kamplar", "/misyonumuz", "/iletisim", "/sss", "/sepet"];

for (const route of routes) {
  test(`WCAG A/AA: ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test("mobile navigation traps and restores keyboard focus", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Menüyü aç" });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Mobil menü" });
  await expect(dialog.getByRole("button", { name: "Menüyü kapat" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});
