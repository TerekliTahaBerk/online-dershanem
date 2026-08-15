import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./helpers/client-ip";

const password = process.env.E2E_PASSWORD || "testpass123";
const accounts = {
  admin: { email: "admin.e2e@example.com", root: "/panel/odk/yonetim" },
  teacher: { email: "teacher.e2e@example.com", root: "/panel/odk/ogretmen" },
  student: { email: "odk.student.e2e@example.com", root: "/panel/odk/ogrenci" },
  parent: { email: "parent.e2e@example.com", root: "/panel/odk/veli" },
} as const;

const routes = {
  admin: [
    "/panel/odk/yonetim",
    "/panel/odk/yonetim/sinavlar",
    "/panel/odk/yonetim/sinavlar/e2e-odk-exam-live",
    "/panel/odk/yonetim/operasyon",
    "/panel/odk/yonetim/pilot",
    "/panel/odk/yonetim/raporlar",
  ],
  teacher: ["/panel/odk/ogretmen", "/panel/odk/ogretmen/raporlar"],
  student: [
    "/panel/odk/ogrenci",
    "/panel/odk/ogrenci/denemeler",
    "/panel/odk/ogrenci/denemeler/e2e-odk-exam-live",
    "/panel/odk/ogrenci/denemeler/e2e-odk-exam-live/coz",
  ],
  parent: ["/panel/odk/veli", "/panel/odk/veli/raporlar"],
} as const;

async function login(page: Page, role: keyof typeof accounts) {
  const account = accounts[role];
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(account.email);
  await page.getByLabel("Şifre").fill(password);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click();
  /*
   * TEK PANEL: giriş artık ürün seçici göstermez ve herkesi kendi ROL
   * paneline yollar; Deneme Kulübü o panelin bir bölümüdür. Bu yüzden test
   * önce panele girer, sonra ODK bölümüne gider. Kapsam daralmadı —
   * aşağıdaki ODK yüzeylerinin hepsi yine tek tek geziliyor.
   */
  await page.waitForURL(/\/panel\//);
  await page.goto(account.root);
  await page.waitForURL((url) => url.pathname === account.root);
}

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const) {
  for (const role of Object.keys(accounts) as Array<keyof typeof accounts>) {
    test(`${role} ODK yüzeyleri ${viewport.name} kalite kapılarını geçer`, async ({ page }, testInfo) => {
      test.setTimeout(120_000);
      await page.setViewportSize(viewport);
      await page.route("**/api/odk/student/exams/*/booklet*", async (route) => {
        const pdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF");
        await route.fulfill({ status: 200, contentType: "application/pdf", body: pdf });
      });
      const consoleErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await login(page, role);
      for (const route of routes[role]) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("main")).toBeVisible();
        await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toHaveCount(0);

        const horizontalOverflow = await page.evaluate(() =>
          Math.max(
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
            document.body.scrollWidth - document.body.clientWidth,
          )
        );
        expect(horizontalOverflow, `${route} yatay taşma`).toBeLessThanOrEqual(1);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();
        const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
        expect(blocking, `${route} erişilebilirlik ihlalleri`).toEqual([]);

        if (process.env.ODK_CAPTURE_UI === "true") {
          const name = route.replace(/^\/+/, "").replaceAll("/", "-") || "root";
          await page.screenshot({ path: testInfo.outputPath(`${name}.png`), fullPage: true });
        }
      }

      expect(consoleErrors, `${role} ${viewport.name} console hataları`).toEqual([]);
    });
  }
}
