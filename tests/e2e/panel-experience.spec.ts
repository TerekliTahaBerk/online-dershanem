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
    });
  }

  test("admin temel yönetim bölümlerini tek oturumda açabilir", async ({ page }) => {
    await login(page, accounts.admin);
    for (const route of ["/panel/yonetim", "/panel/yonetim/takvim", "/panel/yonetim/kullanicilar", "/panel/yonetim/egitim", "/panel/yonetim/isler", "/panel/yonetim/kayitlar"]) {
      const response = await page.goto(route);
      expect(response?.status(), route).toBe(200);
      await expect(page.getByRole("main")).toBeVisible();
    }
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
    await expect(page.getByRole("button", { name: "Ada Öğrenci: Geç" })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("4/4", { exact: true })).toBeVisible();
  });
});
