import { expect, test, type Page } from "@playwright/test";

const accounts = {
  teacher: { email: process.env.PANEL_E2E_TEACHER_EMAIL, password: process.env.PANEL_E2E_TEACHER_PASSWORD },
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

test.describe("panel rol ve yatay erişim sınırları", () => {
  test.skip(!Object.values(accounts).every((item) => item.email && item.password), "Panel E2E hesapları tanımlı değil.");

  test("öğretmen yönetim ve öğrenci panelini açamaz", async ({ page }) => {
    await login(page, accounts.teacher);
    await expect(page).toHaveURL(/\/panel\/ogretmen/);
    await page.goto("/panel/yonetim");
    await expect(page.getByText(/sayfa bulunamadı/i)).toBeVisible();
    await page.goto("/panel/ogrenci");
    await expect(page.getByText(/sayfa bulunamadı/i)).toBeVisible();
    const exportStatus = await page.evaluate(async () => (await fetch("/api/panel/reports/export?range=30")).status);
    expect(exportStatus).toBe(403);
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
    await page.goto(`/panel/veli?studentId=${process.env.PANEL_E2E_FOREIGN_STUDENT_ID}`);
    // App Router, streaming başladıktan sonra notFound() çalışırsa HTTP yanıtı
    // 200 kalabilir; güvenlik sonucu kullanıcıya veri yerine 404 yüzeyidir.
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
    for (const route of ["takvim", "takip"]) {
      await page.goto(`/panel/veli/${route}?studentId=${process.env.PANEL_E2E_FOREIGN_STUDENT_ID}`);
      await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
    }
  });

  test("öğretmen başka grubun ders notunu değiştiremez", async ({ page }) => {
    test.skip(!process.env.PANEL_E2E_FOREIGN_LESSON_ID, "Yabancı ders kimliği tanımlı değil.");
    await login(page, accounts.teacher);
    const status = await page.evaluate(async (lessonId) => {
      const response = await fetch(`/api/panel/lessons/${lessonId}/notes`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ topic: "", note: "", nextGoal: "", homework: "", students: [] }),
      });
      return response.status;
    }, process.env.PANEL_E2E_FOREIGN_LESSON_ID!);
    expect(status).toBe(404);
  });
});
