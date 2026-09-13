import { defineConfig, devices } from "@playwright/test";

/**
 * Storybook a11y otomasyonu — `npm run storybook:a11y`.
 * Önce `npm run storybook:build` ile `storybook-static/` üretilmiş olmalı.
 */
const port = 6007;

export default defineConfig({
  testDir: "./tests/storybook",
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: { baseURL: `http://127.0.0.1:${port}` },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node scripts/serve-static.mjs storybook-static ${port}`,
    url: `http://127.0.0.1:${port}/index.json`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
