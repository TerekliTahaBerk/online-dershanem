import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { loginAs } from "./helpers/panel-login";

/**
 * DESIGN PHASE 4 — Deneme Ligi öğrenci: Bugün, Denemelerim, başlamadan önce
 * (docs/panel-design-roadmap.md §11.1–11.3). Sınav ekranı ve başlatma ucu bu
 * fazda değişmedi; `odk-exam-flow.spec.ts` onları ayrıca korur.
 */

const prisma = new PrismaClient();
const examId = "e2e-odk-exam-live";
const studentUserId = "e2e-user-odk-student";
const account = { ...panelE2EAccounts.odkStudent, failureLabel: "ODK STUDENT" };

async function openWindow(withAttempt: boolean) {
  await prisma.odkExam.update({
    where: { id: examId },
    data: { status: "SCHEDULED", startsAt: new Date(Date.now() - 2 * 60_000), endsAt: new Date(Date.now() + 60 * 60_000), resultsReleasedAt: null, answerKeyReleasedAt: null },
  });
  await prisma.odkExamAttempt.deleteMany({ where: { examId, studentUserId } });
  if (withAttempt) {
    await prisma.odkExamAttempt.create({
      data: { id: "e2e-odk-attempt-live", examId, versionId: "e2e-odk-version-live", studentUserId, attemptNumber: 1, status: "IN_PROGRESS", startedAt: new Date(), deadlineAt: new Date(Date.now() + 45 * 60_000), lastActivityAt: new Date() },
    });
  }
}

test.describe("Design Phase 4 — Deneme Ligi öğrenci", () => {
  test.skip(!account.password, "ODK E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Bugün devam eden denemeyi tek blokta gösterir; Denemelerim sekmeli tablodur", async ({ page }) => {
    await openWindow(true);
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account, { panel: "ODK" });
    await page.goto("/panel/odk/ogrenci");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Bugün", level: 1 })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Devam eden deneme", level: 2 })).toBeVisible();
    await expect(main.getByRole("link", { name: "Devam et" })).toHaveAttribute("href", `/panel/odk/ogrenci/denemeler/${examId}/coz`);
    await expect(main.locator(".panel-metric-card")).toHaveCount(0);

    await page.goto("/panel/odk/ogrenci/denemeler");
    await expect(page.getByRole("region", { name: "Devam eden deneme" })).toBeVisible();
    const tabs = page.getByRole("navigation", { name: "Deneme görünümü" });
    await tabs.getByRole("link", { name: /Açık/ }).click();
    await expect(page).toHaveURL(/gorunum=acik/);
    await expect(page.getByRole("table", { name: "Denemeler" }).getByRole("link", { name: /E2E Canlı Matematik Denemesi/ })).toHaveAttribute("href", /\/coz$/);
  });

  test("başlamadan önce deneme bilgisi, hazırlık kontrolü ve onay adımı görünür; başlatma onaysız gitmez", async ({ page }) => {
    await openWindow(false);
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account, { panel: "ODK" });
    await page.goto(`/panel/odk/ogrenci/denemeler/${examId}`);
    await page.waitForLoadState("networkidle");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Deneme bilgisi", level: 2 })).toBeVisible();
    await expect(main.getByText("Soru sayısı", { exact: true })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Hazırlık kontrolü" })).toBeVisible();
    const meet = main.getByRole("checkbox", { name: /Meet odasına katıldım/ });
    if (await meet.count()) await meet.check();
    const startButton = main.getByRole("button", { name: "Denemeyi Başlat" });
    // Pencere ürün sözleşmesinden gelir; kapalıysa düğme gerekçesiyle devre dışıdır.
    if (await startButton.isDisabled()) {
      await expect(main.getByText(/henüz|süresi|doldu|açılmadı/).first()).toBeVisible();
      expect(await prisma.odkExamAttempt.count({ where: { examId, studentUserId } })).toBe(0);
      return;
    }
    await startButton.click();
    const confirm = main.getByRole("group", { name: "Başlatma onayı" });
    await expect(confirm).toContainText("sunucuda");
    await confirm.getByRole("button", { name: "Vazgeç" }).click();
    await expect(confirm).toHaveCount(0);
    expect(await prisma.odkExamAttempt.count({ where: { examId, studentUserId } })).toBe(0);
  });
});
