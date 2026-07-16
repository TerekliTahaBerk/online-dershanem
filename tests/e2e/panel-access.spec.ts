import { expect, test, type Page } from "@playwright/test";

const accounts = {
  teacher: { email: process.env.PANEL_E2E_TEACHER_EMAIL, password: process.env.PANEL_E2E_TEACHER_PASSWORD },
  student: { email: process.env.PANEL_E2E_STUDENT_EMAIL, password: process.env.PANEL_E2E_STUDENT_PASSWORD },
  parent: { email: process.env.PANEL_E2E_PARENT_EMAIL, password: process.env.PANEL_E2E_PARENT_PASSWORD },
};

async function login(page: Page, account: { email?: string; password?: string }) {
  await page.goto("/giris");
  await page.getByLabel("E-posta").fill(account.email!);
  await page.getByLabel("Parola").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
  await page.waitForURL(/\/panel\//);
}

test.describe("panel rol ve yatay erişim sınırları", () => {
  test.skip(!Object.values(accounts).every((item) => item.email && item.password), "Panel E2E hesapları tanımlı değil.");

  test("öğretmen yönetim ve öğrenci panelini açamaz", async ({ page }) => {
    await login(page, accounts.teacher);
    await expect(page).toHaveURL(/\/panel\/ogretmen/);
    await page.goto("/panel/yonetim");
    await expect(page.getByText(/sayfa bulunamadı/i)).toBeVisible();
    await page.goto("/panel/ogrenci");
    await expect(page.getByText(/sayfa bulunamadı/i)).toBeVisible();
  });

  test("öğrenci öğretmen ve veli panelini açamaz", async ({ page }) => {
    await login(page, accounts.student);
    await expect(page).toHaveURL(/\/panel\/ogrenci/);
    await page.goto("/panel/ogretmen");
    await expect(page.getByText(/sayfa bulunamadı/i)).toBeVisible();
    await page.goto("/panel/veli");
    await expect(page.getByText(/sayfa bulunamadı/i)).toBeVisible();
  });

  test("veli URL ile başka öğrenciyi açamaz", async ({ page }) => {
    test.skip(!process.env.PANEL_E2E_FOREIGN_STUDENT_ID, "Yabancı öğrenci kimliği tanımlı değil.");
    await login(page, accounts.parent);
    const response = await page.goto(`/panel/veli?studentId=${process.env.PANEL_E2E_FOREIGN_STUDENT_ID}`);
    expect(response?.status()).toBe(404);
  });

  test("öğretmen başka grubun ders notunu değiştiremez", async ({ page }) => {
    test.skip(!process.env.PANEL_E2E_FOREIGN_LESSON_ID, "Yabancı ders kimliği tanımlı değil.");
    await login(page, accounts.teacher);
    const response = await page.request.put(`/api/panel/lessons/${process.env.PANEL_E2E_FOREIGN_LESSON_ID}/notes`, {
      data: { topic: "", note: "", nextGoal: "", homework: "", students: [] },
      headers: { origin: new URL(page.url()).origin },
    });
    expect(response.status()).toBe(404);
  });
});
