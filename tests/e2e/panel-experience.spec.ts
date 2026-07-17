import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.PANEL_E2E_TEACHER_PASSWORD;
const accounts = {
  admin: { email: process.env.PANEL_E2E_ADMIN_EMAIL, password: process.env.PANEL_E2E_ADMIN_PASSWORD },
  teacher: { email: process.env.PANEL_E2E_TEACHER_EMAIL, password },
  student: { email: process.env.PANEL_E2E_STUDENT_EMAIL, password: process.env.PANEL_E2E_STUDENT_PASSWORD },
  parent: { email: process.env.PANEL_E2E_PARENT_EMAIL, password: process.env.PANEL_E2E_PARENT_PASSWORD },
};

async function login(page: Page, account: { email?: string; password?: string }) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `e2e-${account.email}-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(account.email!);
  await page.getByLabel("Parola").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
  await page.waitForURL(/\/panel\//);
  await expect(page.getByRole("main")).toBeVisible();
}

test.describe("panel deneyimi", () => {
  test.skip(!Object.values(accounts).every((account) => account.email && account.password), "Panel E2E hesapları tanımlı değil.");

  for (const [role, account] of Object.entries(accounts)) {
    test(`${role} paneli mobilde taşmıyor ve WCAG A/AA ihlali üretmiyor`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await login(page, account);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(result.violations).toEqual([]);
      await page.goto("/panel/bildirimler");
      await expect(page.getByRole("heading", { name: "Önemli gelişmeler tek yerde." })).toBeVisible();
      const notificationOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(notificationOverflow).toBeLessThanOrEqual(1);
    });
  }

  test("admin temel yönetim bölümlerini tek oturumda açabilir", async ({ page }) => {
    await login(page, accounts.admin);
    for (const route of ["/panel/yonetim", "/panel/yonetim/takvim", "/panel/yonetim/kullanicilar", "/panel/yonetim/egitim", "/panel/yonetim/isler", "/panel/yonetim/kayitlar", "/panel/yonetim/raporlar", "/panel/bildirimler"]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.getByRole("main")).toBeVisible();
    }
  });

  test("öğrenci gelişim ve materyal, veli bildirim ekranlarını açabilir", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/gelisim"); await expect(page.getByRole("heading", { name: "Her küçük adım görünür." })).toBeVisible();
    await page.goto("/panel/ogrenci/materyaller"); await expect(page.getByText("E2E Köklü İfadeler Föyü")).toBeVisible();
    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    await page.goto("/panel/bildirimler"); await expect(page.getByText("E2E panel hazır")).toBeVisible();
  });

  test("öğretmen dört öğrencinin ders özetini tek ekranda otomatik kaydeder", async ({ page }) => {
    await login(page, accounts.teacher);
    await expect(page.getByRole("heading", { name: "E2E Hızlı Ders Özeti" })).toBeVisible();

    await page.getByRole("button", { name: /Geçen dersten akıllı öneri/ }).click();
    await expect(page.getByRole("textbox", { name: "Bugün ne işlediniz?" }).last()).toHaveValue("Köklü ifadelerde dört işlem");
    await page.getByRole("textbox", { name: "Gruba ortak kısa not" }).last().fill("Grup konuyu kavradı; işlem sırasını pekiştiriyoruz.");
    await page.getByRole("textbox", { name: "Bir sonraki hedef" }).last().fill("Yeni nesil sorularda hız kazanmak.");
    await page.getByRole("textbox", { name: "Çalışma / ödev" }).last().fill("20 karma soru ve yanlış analizi.");
    await page.getByRole("button", { name: "Ada Öğrenci: Geç" }).click();
    await page.getByRole("textbox", { name: "Ada Öğrenci için özel not" }).last().fill("İşlem kontrolünü son adımda tekrar et.");

    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible({ timeout: 6_000 });
    await page.getByRole("button", { name: "Dersi tamamla" }).click();
    await expect(page.getByText(/öğrenci ve veli özeti hazır/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Ada Öğrenci: Geç" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("4/4", { exact: true })).toBeVisible();
  });

  test("admin hızlı kurulumla grup, veli bağlantısı ve haftalık program oluşturur", async ({ page }) => {
    await login(page, accounts.admin);
    const name = `E2E Hızlı Kurulum ${Date.now()}`;
    const status = await page.evaluate(async ({ name }) => { const response = await fetch("/api/panel/setup", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, subject: "Matematik", level: "8. Sınıf", teacherId: "e2e-user-teacher", studentIds: ["e2e-student-profile"], parentLinks: [{ parentId: "e2e-user-parent", studentId: "e2e-student-profile" }], lessonTitle: "E2E Haftalık Program", startsAt: new Date(Date.now() + 3 * 86400000).toISOString(), repeatWeeks: 4, meetingUrl: "https://example.com/e2e-room" }) }); return response.status; }, { name });
    expect(status).toBe(200);
    await page.goto("/panel/yonetim/egitim");
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  });

  test("ödev durumu öğrenciden veli görünümüne yansır", async ({ page }) => {
    await login(page, accounts.student);
    await page.goto("/panel/ogrenci/odevler");
    const card = page.getByRole("article").filter({ hasText: "E2E Yeni Nesil Sorular" });
    const doneButton = card.getByRole("button", { name: "Tamamlandı" });
    await doneButton.click();
    await expect(doneButton).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("İlerlemen kaydedildi.")).toBeVisible();

    await page.getByRole("button", { name: /çıkış/i }).click();
    await login(page, accounts.parent);
    await page.goto("/panel/veli/takip");
    await expect(page.getByRole("article").filter({ hasText: "E2E Yeni Nesil Sorular" }).getByText("Tamamlandı", { exact: true })).toBeVisible();
  });
});
