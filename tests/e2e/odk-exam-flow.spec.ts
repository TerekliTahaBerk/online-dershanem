import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { uniqueTestClientIp } from "./helpers/client-ip";

const prisma = new PrismaClient();
const examId = "e2e-odk-exam-live";
const attemptId = "e2e-odk-attempt-live";
const foreignAttemptId = "e2e-odk-attempt-foreign";
const question1 = "e2e-odk-question-live-1";
const question2 = "e2e-odk-question-live-2";
const account = panelE2EAccounts.odkStudent;

async function resetAttempt(deadline = new Date(Date.now() + 60 * 60_000)) {
  await prisma.rateLimitEntry.deleteMany({
    where: {
      OR: [
        { key: { contains: ":user:e2e-user-" } },
        { key: { contains: ":ip:2001:db8:" } },
      ],
    },
  });
  await prisma.odkExam.update({
    where: { id: examId },
    data: {
      status: "SCHEDULED",
      startsAt: new Date(Date.now() - 2 * 60_000),
      endsAt: new Date(Date.now() + 60 * 60_000),
      resultsReleasedAt: null,
      answerKeyReleasedAt: null,
    },
  });
  await prisma.odkExamAttempt.deleteMany({ where: { examId } });
  await prisma.odkExamAttempt.createMany({
    data: [
      { id: attemptId, examId, versionId: "e2e-odk-version-live", studentUserId: "e2e-user-odk-student", attemptNumber: 1, status: "IN_PROGRESS", startedAt: new Date(), deadlineAt: deadline, lastActivityAt: new Date() },
      { id: foreignAttemptId, examId, versionId: "e2e-odk-version-live", studentUserId: "e2e-user-student-foreign", attemptNumber: 1, status: "IN_PROGRESS", startedAt: new Date(), deadlineAt: deadline, lastActivityAt: new Date() },
    ],
  });
}

async function login(page: Page, email = account.email) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(email);
  await page.getByLabel("Şifre").fill(account.password!);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click();
  await page.waitForURL(/\/panel\//);
  if (new URL(page.url()).pathname === "/panel/urun-sec") {
    await page.getByRole("link", { name: "Online Deneme Kulübü paneline git" }).click();
  }
  await page.waitForURL(/\/panel\/odk\/ogrenci/);
}

async function apiLogin(page: Page, email: string) {
  const status = await page.evaluate(async ({ email: loginEmail, password }) => {
    await fetch("/api/auth/logout", { method: "POST" });
    return (await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: loginEmail, password }),
    })).status;
  }, { email, password: account.password });
  expect(status).toBe(200);
}

async function openRunnerFromPanel(page: Page) {
  const examsLink = page.getByRole("link", { name: "Denemeler", exact: true });
  await examsLink.focus();
  await expect(examsLink).toBeFocused();
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/panel\/odk\/ogrenci\/denemeler$/);
  await page.getByRole("link", { name: /E2E Canlı Matematik Denemesi/ }).click();
  await page.getByRole("button", { name: "Denemeye Devam Et" }).click();
  await page.waitForURL(new RegExp(`/panel/odk/ogrenci/denemeler/${examId}/coz$`));
  if (await page.getByRole("button", { name: /Cevaplar/ }).isVisible()) {
    await page.getByRole("button", { name: /Cevaplar/ }).click();
  }
}

async function mockBooklet(page: Page) {
  await page.route(`**/api/odk/student/exams/${examId}/booklet*`, (route) => route.fulfill({
    status: 200,
    contentType: "application/pdf",
    body: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF"),
  }));
}

test.describe("@odk-critical ODK zorunlu sınav matrisi", () => {
  test.skip(!account.password, "ODK E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await resetAttempt();
    await mockBooklet(page);
  });

  test("login, booklet, autosave/reconnect, resume, submit ve sonuç kurallarını tamamlar", async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await login(page);
    await openRunnerFromPanel(page);

    await expect(page.getByTitle("Deneme kitapçığı")).toBeAttached();
    await expect(page.getByLabel(/Kalan süre/)).toBeVisible();
    await expect(page.locator("header").first()).toHaveCSS("position", "sticky");

    await page.emulateMedia({ reducedMotion: "reduce", forcedColors: "active" });
    expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
    await page.evaluate(() => { document.documentElement.style.zoom = "150%"; });
    await expect(page.getByLabel(/Kalan süre/)).toBeVisible();
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });

    const answerA = page.getByRole("button", { name: "A", exact: true });
    const touchBox = await answerA.boundingBox();
    expect(touchBox?.height).toBeGreaterThanOrEqual(44);
    expect(touchBox?.width).toBeGreaterThanOrEqual(44);
    if (testInfo.project.name.includes("iphone") || testInfo.project.name.includes("android")) {
      const viewport = page.viewportSize()!;
      await page.setViewportSize({ width: viewport.height, height: viewport.width });
      await expect(page.getByLabel(/Kalan süre/)).toBeVisible();
      await expect(page.locator("header").first()).toHaveCSS("position", "sticky");
      await page.setViewportSize(viewport);
    }

    let answerRequests = 0;
    await page.route(`**/api/odk/student/attempts/${attemptId}/answers`, async (route) => {
      answerRequests += 1;
      if (answerRequests < 3) await route.abort("internetdisconnected");
      else await route.continue();
    });
    await answerA.click();
    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible({ timeout: 15_000 });
    expect(answerRequests).toBe(3);
    await page.unroute(`**/api/odk/student/attempts/${attemptId}/answers`);

    await page.getByRole("button", { name: "Sonra bakmak için işaretle" }).click();
    await expect(page.getByRole("button", { name: "İşareti kaldır" })).toBeVisible();
    await page.getByRole("button", { name: /Sonraki/ }).click();
    await page.getByRole("button", { name: "B", exact: true }).click();
    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible();

    await page.reload();
    if (await page.getByRole("button", { name: /Cevaplar/ }).isVisible()) await page.getByRole("button", { name: /Cevaplar/ }).click();
    await page.getByRole("button", { name: /Soru 2, cevaplandı/ }).click();
    await expect(page.getByRole("button", { name: "B", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: /Soru 1, cevaplandı, işaretli/ }).click();
    await expect(page.getByRole("button", { name: "A", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Cevabı temizle" }).click();
    await expect(page.getByRole("button", { name: "A", exact: true })).toHaveAttribute("aria-pressed", "false");
    await page.getByRole("button", { name: "A", exact: true }).click();
    await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible();

    const revision = (await prisma.odkAttemptAnswer.findUniqueOrThrow({ where: { attemptId_questionId: { attemptId, questionId: question2 } } })).revision;
    const statuses = await page.evaluate(async ({ attemptId: id, questionId, revision: nextRevision }) => {
      const request = (selectedOption: "C" | "D") => fetch(`/api/odk/student/attempts/${id}/answers`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, selectedOption, isMarked: false, revision: nextRevision }) });
      return (await Promise.all([request("C"), request("D")])).map((response) => response.status).sort();
    }, { attemptId, questionId: question2, revision: revision + 1 });
    expect(statuses).toEqual([200, 409]);

    const heartbeat = await page.evaluate(async (id) => {
      const response = await fetch(`/api/odk/student/attempts/${id}/heartbeat`, { method: "POST" });
      return { status: response.status, body: await response.json() };
    }, attemptId);
    expect(heartbeat.status).toBe(200);
    expect(Math.abs(new Date(heartbeat.body.serverNow).getTime() - Date.now())).toBeLessThan(10_000);

    const foreignStatus = await page.evaluate(async ({ id, questionId }) => (await fetch(`/api/odk/student/attempts/${id}/answers`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ questionId, selectedOption: "A", isMarked: false, revision: 1 }) })).status, { id: foreignAttemptId, questionId: question1 });
    expect(foreignStatus).toBe(404);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Denemeyi teslim et" }).click();
    await page.waitForURL(new RegExp(`/panel/odk/ogrenci/denemeler/${examId}$`));
    await expect(page.getByText("Denemen tamamlandı.")).toBeVisible();
    expect((await page.request.get(`/api/odk/student/exams/${examId}/answer-key`)).status()).toBe(404);
    await page.goto(`/panel/odk/ogrenci/denemeler/${examId}/sonuc`);
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();

    await prisma.odkExam.update({ where: { id: examId }, data: { endsAt: new Date(Date.now() - 1_000) } });
    await apiLogin(page, "admin.e2e@example.com");
    const adminStatuses = await page.evaluate(async (id) => {
      const score = await fetch(`/api/odk/admin/exams/${id}/score`, { method: "POST" });
      const release = await fetch(`/api/odk/admin/exams/${id}/release`, { method: "POST" });
      return [score.status, release.status];
    }, examId);
    expect(adminStatuses).toEqual([200, 200]);

    await apiLogin(page, account.email);
    await page.goto(`/panel/odk/ogrenci/denemeler/${examId}/sonuc`);
    await expect(page.getByRole("heading", { name: "Deneme Sonucun" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Soru cevap dökümü" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Cevap anahtarı PDF" })).toHaveCount(0);
  });

  test("sunucu saati tarayıcı saati ileri olsa da süre dolunca otomatik teslim eder", async ({ page }) => {
    test.setTimeout(45_000);
    await resetAttempt(new Date(Date.now() + 7_000));
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + 7 * 24 * 60 * 60_000;
    });
    await login(page);
    await page.goto(`/panel/odk/ogrenci/denemeler/${examId}/coz`);
    await page.waitForURL(new RegExp(`/panel/odk/ogrenci/denemeler/${examId}$`), { timeout: 20_000 });
    await expect(page.getByText("Denemen tamamlandı.")).toBeVisible();
    const attempt = await prisma.odkExamAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    expect(attempt.status).toBe("AUTO_SUBMITTED");
  });
});

test.afterAll(async () => prisma.$disconnect());
