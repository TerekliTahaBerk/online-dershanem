import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { loginAs } from "./helpers/panel-login";

/**
 * SINAV EKRANI GÖRSEL KARŞILAŞTIRMA (docs/panel-design-roadmap.md §11.4).
 * Kitapçık (tarayıcının PDF görünümü), sayaç ve kayıt durumu değişken olduğu
 * için maskelenir; düzen, dokunma hedefleri ve oturum ekranları karşılaştırılır.
 * Bilinçli bir görsel değişiklikten sonra: `npx playwright test
 * tests/e2e/odk-runner-visual.spec.ts --update-snapshots`.
 */

const prisma = new PrismaClient();
const account = { ...panelE2EAccounts.odkStudent, failureLabel: "ODK STUDENT" };
const studentUserId = "e2e-user-odk-student";
const MIN = 60_000;

const VIEWPORTS = [
  { name: "telefon", width: 390, height: 844 },
  { name: "dikey-tablet", width: 768, height: 1024 },
  { name: "yatay-tablet", width: 1024, height: 768 },
  { name: "masaustu", width: 1440, height: 900 },
] as const;

async function liveAttempt() {
  await prisma.odkExam.update({
    where: { id: "e2e-odk-exam-live" },
    data: { status: "SCHEDULED", startsAt: new Date(Date.now() - 2 * MIN), endsAt: new Date(Date.now() + 60 * MIN) },
  });
  await prisma.odkExamAttempt.deleteMany({ where: { examId: "e2e-odk-exam-live", studentUserId } });
  await prisma.odkExamAttempt.create({
    data: { id: "e2e-odk-attempt-live", examId: "e2e-odk-exam-live", versionId: "e2e-odk-version-live", studentUserId, attemptNumber: 1, status: "IN_PROGRESS", startedAt: new Date(), deadlineAt: new Date(Date.now() + 45 * MIN), lastActivityAt: new Date() },
  });
}

async function lgsBreakAttempt() {
  await prisma.odkExamAttempt.deleteMany({ where: { examId: "e2e-odk-exam-lgs", studentUserId } });
  const startedAt = new Date(Date.now() - 20 * MIN);
  const closedAt = new Date(Date.now() - 5 * MIN);
  await prisma.odkExamAttempt.create({
    data: { id: "e2e-odk-attempt-lgs", examId: "e2e-odk-exam-lgs", versionId: "e2e-odk-version-lgs", studentUserId, attemptNumber: 1, status: "IN_PROGRESS", startedAt, deadlineAt: new Date(closedAt.getTime() + 125 * MIN), lastActivityAt: new Date() },
  });
  await prisma.odkAttemptSessionClosure.create({ data: { attemptId: "e2e-odk-attempt-lgs", sessionKey: "SOZEL", closedAt } });
}

test.describe("ODK sınav ekranı görsel karşılaştırma", () => {
  test.skip(!account.password, "ODK E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });
  test.afterAll(async () => {
    await prisma.odkExamAttempt.deleteMany({ where: { examId: "e2e-odk-exam-lgs", studentUserId } });
    await prisma.$disconnect();
  });

  for (const viewport of VIEWPORTS) {
    test(`tek oturumlu sınav ekranı · ${viewport.name}`, async ({ page }) => {
      await liveAttempt();
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await loginAs(page, account, { panel: "ODK" });
      await page.route("**/api/odk/student/exams/*/booklet*", (route) =>
        route.fulfill({ status: 200, contentType: "text/html", body: "<html><body style='margin:0;background:#fff'></body></html>" }),
      );
      await page.goto("/panel/odk/ogrenci/denemeler/e2e-odk-exam-live/coz");
      await expect(page.getByRole("banner").getByLabel(/Kalan süre/)).toBeVisible();
      if (viewport.width < 768) await page.getByRole("button", { name: /Cevaplar/ }).click();
      // Sınav ekranı düzenli kalp atışı gönderir; ağ hiç boşa düşmez. Yazı tiplerini bekle.
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(`sinav-ekrani-${viewport.name}.png`, {
        animations: "disabled",
        caret: "hide",
        maxDiffPixelRatio: 0.01,
        mask: [page.getByRole("banner").getByLabel(/Kalan süre/), page.locator("iframe")],
      });
    });
  }

  test("LGS oturum arası ekranı", async ({ page }) => {
    await lgsBreakAttempt();
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, account, { panel: "ODK" });
    await page.goto("/panel/odk/ogrenci/denemeler/e2e-odk-exam-lgs/coz");
    await expect(page.getByRole("timer")).toBeVisible();
    await expect(page).toHaveScreenshot("lgs-oturum-arasi-masaustu.png", {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01,
      mask: [page.getByRole("timer"), page.getByRole("heading", { level: 1 })],
    });
  });
});
