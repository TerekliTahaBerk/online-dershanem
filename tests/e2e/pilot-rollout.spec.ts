import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const password = process.env.PANEL_E2E_TEACHER_PASSWORD || "testpass123";
const accounts = {
  admin: { email: process.env.PANEL_E2E_ADMIN_EMAIL, password: process.env.PANEL_E2E_ADMIN_PASSWORD },
  teacher: { email: process.env.PANEL_E2E_TEACHER_EMAIL, password },
  student: { email: process.env.PANEL_E2E_STUDENT_EMAIL, password: process.env.PANEL_E2E_STUDENT_PASSWORD },
  parent: { email: process.env.PANEL_E2E_PARENT_EMAIL, password: process.env.PANEL_E2E_PARENT_PASSWORD },
  excludedTeacher: { email: "other.teacher.e2e@example.com", password },
};

async function login(page: Page, account: { email?: string; password?: string }, expectPanel = true) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `pilot-${account.email}-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(account.email!);
  await page.getByLabel("Parola").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
  await page.waitForURL(/\/panel\//);
  if (expectPanel && new URL(page.url()).pathname === "/panel/urun-sec") {
    await page.getByRole("link", { name: "Online Dershanem paneline git" }).click();
    await page.waitForURL(/\/panel\/(yonetim|ogretmen|ogrenci|veli)/);
  }
  if (expectPanel) await expect(page.getByRole("main")).toBeVisible();
}

async function logout(page: Page) { const status = await page.evaluate(async () => (await fetch("/api/auth/logout", { method: "POST" })).status); expect(status).toBe(200); await page.goto("/giris"); }

test.describe.serial("bütünleşik pilot yayını", () => {
  test.skip(!accounts.admin.email || !accounts.admin.password || !accounts.teacher.email || !accounts.student.email || !accounts.parent.email, "Panel E2E hesapları tanımlı değil.");

  test("admin dört rollü kohortu oluşturur ve readiness kapılarıyla aktive eder", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, accounts.admin);
    await page.goto("/panel/yonetim/pilot");
    await expect(page.getByRole("heading", { name: "Önce küçük kohort, sonra kanıtlı genişleme." })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations).toEqual([]);
    let cohort = page.getByRole("article").filter({ hasText: "E2E LGS Grubu" }).first();
    if (!(await cohort.count())) {
      await page.getByLabel("Pilot grubu").selectOption("e2e-group");
      await page.getByRole("button", { name: "Pilot taslağı oluştur" }).click();
      await expect(page.getByText(/Dört rollü pilot taslağı oluşturuldu/)).toBeVisible();
      cohort = page.getByRole("article").filter({ hasText: "E2E LGS Grubu" }).first();
    }
    await expect(cohort.getByText(/Admin 1 · Öğretmen 1 · Öğrenci 4 · Veli 1/)).toBeVisible();
    const activate = cohort.getByRole("button", { name: "Aktive et" });
    if (await activate.count()) await activate.click();
    await expect(cohort.getByText("ACTIVE", { exact: true })).toBeVisible();
  });

  test("kohorttaki öğretmen, öğrenci ve veli geçer; dış öğretmen kapalı kalır", async ({ page }) => {
    for (const [account, path] of [[accounts.teacher, "/panel/ogretmen"], [accounts.student, "/panel/ogrenci"], [accounts.parent, "/panel/veli"]] as const) {
      await login(page, account); await expect(page).toHaveURL(new RegExp(path)); await logout(page);
    }
    await login(page, accounts.excludedTeacher, false);
    if (new URL(page.url()).pathname === "/panel/urun-sec") {
      await page.getByRole("link", { name: "Online Dershanem paneline git" }).click();
    }
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
    const apiStatus = await page.evaluate(async () => (await fetch("/api/panel/calendar/export")).status);
    expect(apiStatus).toBe(404);
  });

  test("admin pilotu duraklatınca mevcut üyenin sayfa ve API erişimi kesilir", async ({ page }) => {
    await login(page, accounts.admin); await page.goto("/panel/yonetim/pilot");
    const cohort = page.getByRole("article").filter({ hasText: "E2E LGS Grubu" }).first();
    await page.getByRole("main").getByLabel("Pilot durdurma nedeni").selectOption("OPERATIONAL");
    await cohort.getByRole("button", { name: "Duraklat" }).click();
    await expect(page.getByText(/Pilot erişimi güvenle durduruldu/)).toBeVisible();
    await logout(page); await login(page, accounts.student, false);
    if (new URL(page.url()).pathname === "/panel/urun-sec") {
      await page.getByRole("link", { name: "Online Dershanem paneline git" }).click();
    }
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
    const apiStatus = await page.evaluate(async () => (await fetch("/api/panel/calendar/export")).status);
    expect(apiStatus).toBe(404);
  });
});
