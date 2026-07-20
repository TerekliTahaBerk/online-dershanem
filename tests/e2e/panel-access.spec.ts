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
    for (const route of ["takvim", "takip", "denemeler", "haftalik"]) {
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
    const planStatus = await page.evaluate(async () => (await fetch("/api/panel/adaptive-plan/e2e-weekly-plan-foreign/approve", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: 1 }) })).status);
    expect(planStatus).toBe(404);
    const digestStatus = await page.evaluate(async () => (await fetch("/api/panel/weekly-digests/e2e-weekly-digest-foreign/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: 1 }) })).status);
    expect(digestStatus).toBe(404);
    const interventionStatus = await page.evaluate(async () => (await fetch("/api/panel/interventions/e2e-intervention-foreign", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ASSIGN_SELF", expectedVersion: 1 }) })).status);
    expect(interventionStatus).toBe(404);
    const recoveryStatus = await page.evaluate(async () => (await fetch("/api/panel/recovery-packages/e2e-recovery-package-foreign/publish", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: 1 }) })).status);
    expect(recoveryStatus).toBe(404);
    const submissionStatus = await page.evaluate(async () => (await fetch("/api/panel/assignment-submissions/e2e-assignment-submission-foreign/review", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedVersion: 1, decision: "APPROVE", feedback: "Yabancı erişim denemesi", interactionDurationMs: 1000, scores: [{ criterionId: "e2e-rubric-foreign-method", level: "MEETS" }, { criterionId: "e2e-rubric-foreign-check", level: "MEETS" }] }) })).status);
    expect(submissionStatus).toBe(404);
  });

  test("öğrenci başka öğrencinin tekrar öğesini yanıtlayamaz", async ({ page }) => {
    await login(page, accounts.student);
    const status = await page.evaluate(async () => (await fetch("/api/panel/review-queue/e2e-review-item-foreign/respond", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ response: "CORRECT", idempotencyKey: "e2e_foreign_attempt" }) })).status);
    expect(status).toBe(404);
    const recoveryStatus = await page.evaluate(async () => (await fetch("/api/panel/recovery-packages/e2e-recovery-package-foreign/items/e2e-recovery-item-foreign/complete", { method: "POST" })).status);
    expect(recoveryStatus).toBe(404);
    const submissionStatus = await page.evaluate(async () => (await fetch("/api/panel/assignments/e2e-assignment-evidence-foreign/submissions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ textEvidence: "Başka öğrencinin çalışmasına gönderilememesi gereken yeterince uzun kanıt.", idempotencyKey: "foreign_assignment_attempt_001" }) })).status);
    expect(submissionStatus).toBe(404);
  });

  for (const [role, account] of Object.entries(accounts) as [keyof typeof accounts, (typeof accounts)[keyof typeof accounts]][]) {
    test(`${role} başka grubun private materyalini okuyamaz`, async ({ page }) => {
      await login(page, account);
      const status = await page.evaluate(async () => (await fetch("/api/panel/materials/e2e-material-private-foreign/file")).status);
      expect(status).toBe(404);
    });
  }
});
