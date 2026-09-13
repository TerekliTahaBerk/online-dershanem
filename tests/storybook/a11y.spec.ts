import { expect, test } from "@playwright/test";
import { accessibilityScan, describeViolations } from "../e2e/helpers/axe";

/**
 * Storybook hikâyelerinin otomatik erişilebilirlik kontrolü.
 *
 * `@storybook/test-runner` ayrı bir Jest yığını getiriyor; projede zaten
 * Playwright + axe olduğu için statik Storybook çıktısı aynı araçla taranır.
 * Hikâye listesi `index.json`'dan okunur: yeni hikâye eklemek kapsamı
 * kendiliğinden genişletir. Etiketler E2E taramalarıyla ortaktır.
 */

type StoryIndex = { entries: Record<string, { id: string; title: string; name: string; type: string }> };

test("tüm Storybook hikâyeleri WCAG taramasını geçer", async ({ page, request }) => {
  const index = (await (await request.get("/index.json")).json()) as StoryIndex;
  const stories = Object.values(index.entries).filter((entry) => entry.type === "story");
  expect(stories.length).toBeGreaterThan(0);
  test.setTimeout(30_000 + stories.length * 10_000);

  for (const story of stories) {
    await test.step(`${story.title} › ${story.name}`, async () => {
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);
      const root = page.locator("#storybook-root");
      await expect.soft(root, `${story.id} render edilmedi`).not.toBeEmpty();
      if (await root.evaluate((element) => element.childElementCount === 0)) return;
      const result = await accessibilityScan(page).include("#storybook-root").analyze();
      expect.soft(result.violations, `${story.id}:\n${describeViolations(result.violations)}`).toEqual([]);
    });
  }
});
