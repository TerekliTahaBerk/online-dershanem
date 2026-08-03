import { expect, test, type Page } from "@playwright/test";
const admin = { email: process.env.PANEL_E2E_ADMIN_EMAIL, password: process.env.PANEL_E2E_ADMIN_PASSWORD };
const teacher = { email: process.env.PANEL_E2E_TEACHER_EMAIL, password: process.env.PANEL_E2E_TEACHER_PASSWORD };
async function login(page: Page, account: { email?: string; password?: string }) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `business-e2e-${Date.now()}-${Math.random()}` });
  await page.request.post("/api/auth/logout"); await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(account.email!); await page.getByLabel("Parola").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click(); await page.waitForURL(/\/panel\//);
  if (new URL(page.url()).pathname === "/panel/urun-sec") await page.getByRole("link", { name: "Online Dershanem paneline git" }).click();
}
test.describe("Instagram CRM ve finans merkezi", () => {
  test.skip(!admin.email || !admin.password || !teacher.email || !teacher.password, "Panel E2E hesapları tanımlı değil.");
  test("admin dashboard, inbox, huni, finans, vergi ve entegrasyon alanlarını açar", async ({ page }) => {
    await login(page, admin);
    for (const section of ["genel-bakis", "mesaj-kutusu", "adaylar", "satis-hunisi", "gelirler", "giderler", "vergiler", "entegrasyonlar"]) {
      const response = await page.goto(`/panel/yonetim/isletme/${section}`); expect(response?.status(), section).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    const csv = await page.request.get("/api/admin/business/reports.csv"); expect(csv.status()).toBe(200); expect(csv.headers()["content-type"]).toContain("text/csv");
  });
  test("işletme rolü olmayan kullanıcı finans API'sine erişemez", async ({ page }) => {
    await login(page, teacher); const response = await page.request.get("/api/admin/business/reports.csv"); expect(response.status()).toBe(401);
  });
});

