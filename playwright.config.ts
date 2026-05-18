import { defineConfig, devices } from "@playwright/test";

/**
 * Online Dershanem — E2E test yapılandırması
 *
 * Çalıştırma:
 *   npm run e2e             — tüm testleri çalıştır (headless)
 *   npm run e2e:ui          — Playwright UI modunda aç
 *   npm run e2e:debug       — debug modu
 *
 * Önkoşullar:
 *   - `npm install -D @playwright/test`
 *   - `npx playwright install chromium`
 *   - Lokal sunucu (PLAYWRIGHT_BASE_URL ile değiştirilebilir)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["html", { open: "never" }], ["github"]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Mobile + Firefox/WebKit ileride aktif edilebilir
    // { name: "mobile-safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
