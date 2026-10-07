import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { loginAs } from "./helpers/panel-login";
import { accessibilityScan } from "./helpers/axe";

async function expectNoBlockingA11y(page: Page, label: string) {
  const results = await accessibilityScan(page).analyze();
  const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
  expect(blocking, `${label} erişilebilirlik ihlalleri`).toEqual([]);
}

/**
 * LGS OTURUMLU DENEME (Sözel → ara → Sayısal) — sunucu kuralları ve arayüz.
 * Zaman yolculuğu deneme kaydının başlangıcı ve erken kapatma kaydı geri
 * alınarak yapılır; saat kurcalanmaz.
 */

const prisma = new PrismaClient();
const examId = "e2e-odk-exam-lgs";
const versionId = "e2e-odk-version-lgs";
const attemptId = "e2e-odk-attempt-lgs";
const studentUserId = "e2e-user-odk-student";
const trQuestion = "e2e-odk-question-lgs-tr-1";
const matQuestion = "e2e-odk-question-lgs-mat-1";
const account = { ...panelE2EAccounts.odkStudent, failureLabel: "ODK STUDENT" };
const origin = { origin: "http://localhost:3000" };
const MIN = 60_000;

async function resetAttempt(startedMinutesAgo = 0) {
  await prisma.odkExamAttempt.deleteMany({ where: { examId, studentUserId } });
  const startedAt = new Date(Date.now() - startedMinutesAgo * MIN);
  await prisma.odkExamAttempt.create({
    data: { id: attemptId, examId, versionId, studentUserId, attemptNumber: 1, status: "IN_PROGRESS", startedAt, deadlineAt: new Date(startedAt.getTime() + 200 * MIN), lastActivityAt: new Date() },
  });
}

async function putAnswer(page: Page, questionId: string, selectedOption: "A" | "B", revision = 1) {
  const response = await page.request.put(`/api/odk/student/attempts/${attemptId}/answers`, {
    data: { questionId, selectedOption, isMarked: false, revision },
    headers: origin,
  });
  return { status: response.status(), body: await response.json() };
}

test.describe("LGS oturumlu deneme", () => {
  test.skip(!account.password, "ODK E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });
  test.afterAll(async () => {
    await prisma.odkExamAttempt.deleteMany({ where: { examId, studentUserId } });
    await prisma.$disconnect();
  });

  test("Sözel açıkken yalnız Sözel yazılır; erken bitirince ara başlar ve hiçbir cevap yazılamaz", async ({ page }) => {
    await resetAttempt(0);
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, account, { panel: "ODK" });
    await page.route(`**/api/odk/student/exams/${examId}/booklet*`, (route) =>
      route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\n%%EOF") }),
    );
    await page.goto(`/panel/odk/ogrenci/denemeler/${examId}/coz`);
    await expect(page.getByRole("banner").getByText("Deneme Ligi · Sözel oturumu")).toBeVisible();
    const palette = page.getByRole("list", { name: "Soru listesi" });
    await expect(palette.getByRole("button", { name: /^Soru 1,/ })).toBeVisible();
    await expect(palette.getByRole("button", { name: /^Soru 3,/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Denemeyi teslim et" })).toHaveCount(0);
    await expectNoBlockingA11y(page, "Sözel oturumu");

    await page.getByRole("button", { name: "A", exact: true }).click();
    await expect(page.getByText("Kaydedildi", { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 15_000 });

    // Sunucu: Sayısal sorusu kilitli; ara oturumda teslim yok.
    const locked = await putAnswer(page, matQuestion, "B");
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe("SESSION_LOCKED");
    const earlySubmit = await page.request.post(`/api/odk/student/attempts/${attemptId}/submit`, { headers: origin });
    expect(earlySubmit.status()).toBe(409);
    expect((await earlySubmit.json()).code).toBe("SESSION_NOT_LAST");

    await page.getByRole("button", { name: "Oturumu bitir" }).click();
    await expect(page.getByRole("heading", { name: "Sözel oturumunu bitir" })).toBeVisible();
    await page.getByRole("button", { name: "Oturumu kapat" }).click();
    await expect(page.getByRole("heading", { name: /Sayısal .*açılır/ })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page.getByRole("button", { name: "A", exact: true })).toHaveCount(0);
    await expectNoBlockingA11y(page, "Oturum arası");

    const closure = await prisma.odkAttemptSessionClosure.findUnique({ where: { attemptId_sessionKey: { attemptId, sessionKey: "SOZEL" } } });
    expect(closure).not.toBeNull();
    const attempt = await prisma.odkExamAttempt.findUniqueOrThrow({ where: { id: attemptId } });
    // Takvim öne çekildi: kalan sınır ≈ şimdi + 45 dk ara + 80 dk Sayısal.
    expect(attempt.deadlineAt.getTime()).toBeLessThan(Date.now() + 126 * MIN);
    const duringBreak = await putAnswer(page, trQuestion, "B", 2);
    expect(duringBreak.body.code).toBe("SESSION_BREAK");
    // Tekrarlanan kapatma idempotent.
    const again = await page.request.post(`/api/odk/student/attempts/${attemptId}/sessions/close`, { data: { sessionKey: "SOZEL" }, headers: origin });
    expect((await again.json()).idempotent).toBe(true);
  });

  test("ara bitince Sayısal taze süreyle açılır; Sözel cevapları kilitli görünür ve teslim çalışır", async ({ page }) => {
    // Sözel 60 dk önce başladı, 46 dk önce erken kapatıldı → ara 1 dk önce bitti.
    await resetAttempt(60);
    const closedAt = new Date(Date.now() - 46 * MIN);
    await prisma.odkAttemptSessionClosure.create({ data: { attemptId, sessionKey: "SOZEL", closedAt } });
    await prisma.odkExamAttempt.update({ where: { id: attemptId }, data: { deadlineAt: new Date(closedAt.getTime() + 125 * MIN) } });
    await prisma.odkAttemptAnswer.create({ data: { attemptId, questionId: trQuestion, selectedOption: "A", revision: 1, answeredAt: new Date() } });

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, account, { panel: "ODK" });
    await page.route(`**/api/odk/student/exams/${examId}/booklet*`, (route) =>
      route.fulfill({ status: 200, contentType: "application/pdf", body: Buffer.from("%PDF-1.4\n%%EOF") }),
    );
    await page.goto(`/panel/odk/ogrenci/denemeler/${examId}/coz`);
    await expect(page.getByRole("banner").getByText("Deneme Ligi · Sayısal oturumu")).toBeVisible();
    const palette = page.getByRole("list", { name: "Soru listesi" });
    await expect(palette.getByRole("button", { name: /^Soru 3,/ })).toBeVisible();
    await expect(palette.getByRole("button", { name: /^Soru 1,/ })).toHaveCount(0);
    // Akış sırasında gizli bir kopya bulunabilir; görünür olanı seç.
    await page.getByText(/Sözel cevapların · kilitli/).filter({ visible: true }).click();
    await expect(page.getByRole("list", { name: "Kilitli oturum cevapları" }).getByLabel("Soru 1, cevabın A, kilitli")).toBeVisible();
    await expectNoBlockingA11y(page, "Sayısal oturumu");

    const lockedTr = await putAnswer(page, trQuestion, "B", 2);
    expect(lockedTr.body.code).toBe("SESSION_LOCKED");
    const mat = await putAnswer(page, matQuestion, "B");
    expect(mat.status).toBe(200);

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("button", { name: "Denemeyi teslim et" }).click();
    await page.waitForURL(new RegExp(`/panel/odk/ogrenci/denemeler/${examId}$`), { timeout: 20_000 });
    await expect(page.getByText("Denemen tamamlandı.").filter({ visible: true })).toBeVisible();
  });
});
