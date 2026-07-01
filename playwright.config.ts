import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

if (process.env.CI && process.env.PANEL_ENABLED !== "true") {
  throw new Error(
    "E2E yapılandırma hatası: PANEL_ENABLED=true olmalı. Aksi halde auth ve panel route'ları bakım sayfasına yönlenir.",
  );
}

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
        env: {
          PANEL_ENABLED: process.env.PANEL_ENABLED ?? "true",
          NEXT_PUBLIC_PANEL_ENABLED: process.env.NEXT_PUBLIC_PANEL_ENABLED ?? "true",
        },
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
