import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const crossBrowser = process.env.PLAYWRIGHT_CROSS_BROWSER === "true";
const odkDeviceMatrix = process.env.PLAYWRIGHT_ODK_DEVICE_MATRIX === "true";
process.env.PANEL_E2E_ADMIN_MFA_BYPASS ??= "true";
process.env.MFA_ENCRYPTION_KEY ??= Buffer.alloc(32, 23).toString("base64");

const odkProjects = [
  { name: "odk-desktop-chromium", use: { ...devices["Desktop Chrome"] } },
  { name: "odk-desktop-webkit", use: { ...devices["Desktop Safari"] } },
  { name: "odk-iphone-webkit", use: { ...devices["iPhone 13"] } },
  { name: "odk-android-chromium", use: { ...devices["Pixel 5"] } },
];

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
 *   - `npx playwright install chromium webkit`
 *   - Lokal sunucu (PLAYWRIGHT_BASE_URL ile değiştirilebilir)
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // CI'da tek retry hem flaky testleri görünür kılar hem de ilk retry'da
  // trace/video üretmek için yeterlidir. İki retry toplam süreyi 3 kata
  // kadar çıkarıyor ve gerçek kararsızlıkları maskeleyebiliyordu.
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  // Blob raporları shard'lardan sonra tek bir HTML raporunda birleştirilir.
  // GitHub reporter ise hata anotasyonlarını doğrudan PR ekranına yazar.
  reporter: process.env.CI ? [["blob"], ["github"]] : "list",
  timeout: 30_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    locale: "tr-TR",
    timezoneId: "Europe/Istanbul",
  },
  projects: odkDeviceMatrix
    ? odkProjects
    : crossBrowser
      ? [
          { name: "chromium", use: { ...devices["Desktop Chrome"] } },
          { name: "firefox", use: { ...devices["Desktop Firefox"] } },
          { name: "webkit", use: { ...devices["Desktop Safari"] } },
        ]
      : [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3000",
        env: { ...process.env, PANEL_E2E_ADMIN_MFA_BYPASS: process.env.PANEL_E2E_ADMIN_MFA_BYPASS },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
