import { expect, test, type Page } from "@playwright/test";

const account = {
  email: process.env.PANEL_E2E_ODK_STUDENT_EMAIL || "odk.student.e2e@example.com",
  password: process.env.PANEL_E2E_ODK_STUDENT_PASSWORD || process.env.PANEL_E2E_STUDENT_PASSWORD || process.env.E2E_PASSWORD,
};

async function login(page: Page, credentials = account) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": `e2e-odk-${Date.now()}-${Math.random().toString(36).slice(2)}` });
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(credentials.email);
  await page.getByLabel("Parola").fill(credentials.password!);
  await page.getByRole("button", { name: /^Giriş yap$/ }).click();
  await page.waitForURL(/\/panel\/odk\/ogrenci/);
}

test.describe("ODK canlı sınav güvenliği ve dayanıklılığı", () => {
  test.skip(!account.password, "ODK E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });

  test("bağlantı hatasında cevabı yeniden dener, revizyon yarışını ve yatay erişimi engeller", async ({ page }) => {
    await login(page);
    await page.goto("/panel/odk/ogrenci/denemeler/e2e-odk-exam-live/coz");
    await expect(page.getByText("Canlı matematik denemesi")).toBeVisible();

    let answerRequests = 0;
    await page.route("**/api/odk/student/attempts/e2e-odk-attempt-live/answers", async (route) => {
      answerRequests += 1;
      if (answerRequests < 3) await route.abort("internetdisconnected");
      else await route.continue();
    });
    await page.getByRole("button", { name: "A", exact: true }).click();
    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible({ timeout: 8_000 });
    expect(answerRequests).toBe(3);

    const statuses = await page.evaluate(async () => {
      const body = (selectedOption: "B" | "C") => JSON.stringify({ questionId: "e2e-odk-question-live-1", selectedOption, isMarked: false, revision: 2 });
      const responses = await Promise.all([fetch("/api/odk/student/attempts/e2e-odk-attempt-live/answers", { method: "PUT", headers: { "content-type": "application/json" }, body: body("B") }), fetch("/api/odk/student/attempts/e2e-odk-attempt-live/answers", { method: "PUT", headers: { "content-type": "application/json" }, body: body("C") })]);
      return responses.map((response) => response.status).sort();
    });
    expect(statuses).toEqual([200, 409]);

    const foreignStatus = await page.evaluate(async () => (await fetch("/api/odk/student/attempts/e2e-odk-attempt-foreign/answers", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId: "e2e-odk-question-live-1", selectedOption: "A", isMarked: false, revision: 1 }) })).status);
    expect(foreignStatus).toBe(404);
    const heartbeatStatus = await page.evaluate(async () => (await fetch("/api/odk/student/attempts/e2e-odk-attempt-live/heartbeat", { method: "POST" })).status);
    expect(heartbeatStatus).toBe(200);

    await page.goto("/panel/odk/yonetim/operasyon");
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
  });

  test("pilot dışındaki ODK üyeliğini ürün paneline almaz", async ({ page }) => {
    test.skip(process.env.ODK_E2E_PILOT_MODE !== "true", "Sunucu ODK pilot modunda değil.");
    await page.setExtraHTTPHeaders({ "x-forwarded-for": `e2e-odk-nonmember-${Date.now()}` });
    await page.goto("/giris");
    await page.getByRole("textbox", { name: "E-posta" }).fill("foreign.student.e2e@example.com");
    await page.getByLabel("Parola").fill(account.password!);
    await page.getByRole("button", { name: /^Giriş yap$/ }).click();
    await page.waitForURL(/\/panel\/odk\/ogrenci/);
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
  });
});
