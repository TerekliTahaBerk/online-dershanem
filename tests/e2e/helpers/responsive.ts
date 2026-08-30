import { expect, type Page } from "@playwright/test";

export async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, context).toBeLessThanOrEqual(1);
}
