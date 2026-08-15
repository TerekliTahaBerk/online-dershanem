import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createHmac } from "node:crypto";
import { uniqueTestClientIp } from "./helpers/client-ip";
const admin = { email: process.env.PANEL_E2E_ADMIN_EMAIL, password: process.env.PANEL_E2E_ADMIN_PASSWORD };
const teacher = { email: process.env.PANEL_E2E_TEACHER_EMAIL, password: process.env.PANEL_E2E_TEACHER_PASSWORD };
async function login(page: Page, account: { email?: string; password?: string }) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout"); await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(account.email!); await page.getByLabel("Şifre").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click(); await page.waitForURL(/\/panel\//);
  if (new URL(page.url()).pathname === "/panel/urun-sec") await page.getByRole("link", { name: "Online Dershanem paneline git" }).click();
}
test.describe("Instagram CRM ve finans merkezi", () => {
  test.describe.configure({ timeout: 120_000 });
  test.skip(!admin.email || !admin.password || !teacher.email || !teacher.password, "Panel E2E hesapları tanımlı değil.");
  test("admin dashboard, inbox, huni, finans, vergi ve entegrasyon alanlarını açar", async ({ page }) => {
    if (process.env.PANEL_E2E_META_SECRET && process.env.PANEL_E2E_JOB_SECRET) {
      const mid = `e2e-webhook-${Date.now()}`; const raw = JSON.stringify({ object: "instagram", entry: [{ id: "e2e-instagram-account", messaging: [{ sender: { id: "e2e-webhook-user" }, recipient: { id: "e2e-instagram-account" }, timestamp: Date.now(), message: { mid, text: "E2E webhook mesajı" } }] }] });
      const signature = `sha256=${createHmac("sha256", process.env.PANEL_E2E_META_SECRET).update(raw).digest("hex")}`;
      for (let index=0; index<2; index++) expect((await page.request.post("/api/integrations/instagram/webhook", { data: raw, headers: { "content-type": "application/json", "x-hub-signature-256": signature } })).status()).toBe(200);
      expect((await page.request.post("/api/cron/business-jobs", { headers: { authorization: `Bearer ${process.env.PANEL_E2E_JOB_SECRET}` } })).status()).toBe(200);
    }
    await login(page, admin);
    /*
     * Ürün seçici ekranı tek-panele geçişte kaldırıldı; işletme alanına artık
     * panel kenar çubuğundaki alan değiştirme bağlantısından geçiliyor.
     */
    await expect(page.getByRole("link", { name: "İşletme paneline geç" })).toBeVisible();
    await page.getByRole("link", { name: "İşletme paneline geç" }).click();
    await expect(page.getByRole("link", { name: "İşletme yönetim ana sayfası" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "İşletme panel menüsü" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kontrol merkezi/ })).toHaveCount(0);
    for (const section of ["genel-bakis", "mesaj-kutusu", "adaylar", "satis-hunisi", "gelirler", "giderler", "vergiler", "entegrasyonlar"]) {
      const response = await page.goto(`/panel/yonetim/isletme/${section}`); expect(response?.status(), section).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.goto("/panel/yonetim/isletme/mesaj-kutusu");
    await page.getByRole("link", { name: /E2E Instagram Adayı/ }).click();
    await expect(page.getByText("Paket fiyatını öğrenebilir miyim?").first()).toBeVisible();
    await page.getByLabel("Yanıt").fill("E2E manuel yanıt");
    await page.getByRole("button", { name: "Gönder" }).click();
    await expect(page.getByText("E2E manuel yanıt", { exact: true }).last()).toBeVisible();

    await page.goto("/panel/yonetim/isletme/satis-hunisi");
    const leadCard = page.locator("form").filter({ hasText: "E2E Aday" }).first();
    await leadCard.getByLabel("Aday aşaması").selectOption("QUALIFIED");
    await leadCard.getByRole("button", { name: "Aşamayı kaydet" }).click();
    await expect(page.getByText(/QUALIFIED ·/)).toBeVisible();

    for (const [section, kind, description] of [["gelirler", "MANUAL_INCOME", "E2E manuel gelir"], ["giderler", "EXPENSE", "E2E manuel gider"]] as const) {
      await page.goto(`/panel/yonetim/isletme/${section}`);
      const financeForm = page.locator("form").filter({ has: page.getByLabel("Hareket türü") }).first();
      await financeForm.getByLabel("Hareket türü").selectOption(kind);
      await financeForm.getByLabel("Açıklama").fill(description);
      await financeForm.getByLabel("Kategori").fill(section === "gelirler" ? "SALE" : "SOFTWARE");
      await financeForm.getByLabel("Tutar TL").fill("120");
      // Admin birden fazla iş birimine erişiyor; kayıt hangi birime yazılacağı
      // AÇIKÇA seçilmeden oluşturulamaz. Sessizce "ilk birime" yazan eski
      // davranış kaldırıldı (bkz. resolveMutationUnit). Seçim, hidratasyon
      // seçimi sıfırlamasın diye gönderimden hemen önce yapılır.
      const unitSelect = financeForm.getByLabel("İş birimi");
      if (await unitSelect.count()) {
        await unitSelect.selectOption({ label: "OnlineDershanem" });
        await expect(unitSelect).not.toHaveValue("");
      }
      const saveResponse = page.waitForResponse((response) =>
        response.request().method() === "POST"
        && new URL(response.url()).pathname === `/panel/yonetim/isletme/${section}`,
      );
      await financeForm.getByRole("button", { name: "Kaydet" }).click();
      expect((await saveResponse).status()).toBeLessThan(400);
      await expect(page.getByText(description).first()).toBeVisible({ timeout: 15_000 });
    }
    await page.goto("/panel/yonetim/isletme/vergiler"); await expect(page.getByText("Hesaplanan KDV").first()).toBeVisible();
    await page.goto("/panel/yonetim/isletme/genel-bakis?product=OD"); await expect(page.getByText("Operasyon özeti").first()).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    const csv = await page.request.get("/api/admin/business/reports.csv"); expect(csv.status()).toBe(200); expect(csv.headers()["content-type"]).toContain("text/csv");
  });
  test("işletme rolü olmayan kullanıcı finans API'sine erişemez", async ({ page }) => {
    await login(page, teacher);
    // İşletme ataması olmayan kullanıcıya alan değiştirme bağlantısı basılmaz.
    await expect(page.getByRole("link", { name: "İşletme paneline geç" })).toHaveCount(0);
    const response = await page.request.get("/api/admin/business/reports.csv"); expect(response.status()).toBe(401);
    await page.goto("/panel/yonetim/isletme/gelirler");
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
  });
});
