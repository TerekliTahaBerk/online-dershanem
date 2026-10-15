import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { accessibilityScan, describeViolations } from "./helpers/axe";
import { loginAs } from "./helpers/panel-login";

/**
 * Faz 6 — kilitli (puanlanmış) denemede cevap anahtarı revizyonu arayüzü:
 * değişiklik + gerekçe → etki önizlemesi (öğrenci neti önce/sonra) → uygula →
 * yeniden puanlama ve revizyon geçmişi. Test kendi denemesini kurar ve siler.
 */

const prisma = new PrismaClient();
const examId = "e2e-odk-revision";
const versionId = "e2e-odk-revision-v1";
const sectionId = "e2e-odk-revision-mat";
const attemptId = "e2e-odk-revision-attempt";
const studentUserId = "e2e-user-odk-student";
const account = panelE2EAccounts.admin;

async function cleanup() {
  await prisma.odkExamAttempt.deleteMany({ where: { examId } });
  await prisma.odkExam.updateMany({ where: { id: examId }, data: { currentVersionId: null } });
  await prisma.odkExamVersion.deleteMany({ where: { examId } });
  await prisma.odkExam.deleteMany({ where: { id: examId } });
}

test.beforeEach(async () => {
  await cleanup();
  const admin = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
  const policy = await prisma.odkScoringPolicy.findUniqueOrThrow({ where: { code: "LGS_MATH_V1" } });
  const now = Date.now();
  await prisma.odkExam.create({ data: { id: examId, title: "E2E Revizyon Denemesi", slug: "e2e-odk-revision", family: "LGS", status: "ENDED", startsAt: new Date(now - 4 * 3_600_000), endsAt: new Date(now - 3_600_000), createdById: admin.id } });
  await prisma.odkExamVersion.create({ data: { id: versionId, examId, versionNumber: 1, status: "LOCKED", durationMinutes: 40, scoringPolicyId: policy.id, createdById: admin.id } });
  await prisma.odkExam.update({ where: { id: examId }, data: { currentVersionId: versionId } });
  await prisma.odkExamSection.create({ data: { id: sectionId, versionId, code: "MAT", title: "Matematik", position: 0, questionCount: 2 } });
  await prisma.odkExamQuestion.createMany({ data: [1, 2].map((number) => ({ id: `${sectionId}-${number}`, sectionId, questionNumber: number, position: number - 1, correctOption: "A" as const })) });
  await prisma.odkExamAttempt.create({ data: { id: attemptId, examId, versionId, studentUserId, attemptNumber: 1, status: "SUBMITTED", startedAt: new Date(now - 3.5 * 3_600_000), deadlineAt: new Date(now - 2 * 3_600_000), submittedAt: new Date(now - 2.5 * 3_600_000) } });
  await prisma.odkAttemptAnswer.createMany({ data: [{ attemptId, questionId: `${sectionId}-1`, selectedOption: "A" }, { attemptId, questionId: `${sectionId}-2`, selectedOption: "B" }] });
});

test.afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

test("yönetici yanlış anahtarı revizyonla düzeltir; etki önizlenir, deneme yeniden puanlanır, geçmiş görünür", async ({ page }) => {
  test.skip(!account.password, "Admin E2E parolası tanımlı değil.");
  test.setTimeout(90_000);
  await loginAs(page, account);
  const scoreStatus = await page.evaluate(async (id) => (await fetch(`/api/odk/admin/exams/${id}/score`, { method: "POST" })).status, examId);
  expect(scoreStatus).toBe(200);
  expect(Number((await prisma.odkAttemptScore.findUniqueOrThrow({ where: { attemptId } })).totalNet)).toBe(0.67);

  await page.goto(`/panel/odk/yonetim/sinavlar/${examId}?sekme=puanlama`);
  const panel = page.getByRole("region", { name: "Cevap anahtarı revizyonu" });
  await expect(panel).toBeVisible();
  await panel.getByLabel("Soru", { exact: true }).selectOption({ label: "MAT 2 · anahtar A" });
  await panel.getByLabel("Yeni cevap").selectOption("B");
  await panel.getByRole("button", { name: "Listeye ekle" }).click();
  await expect(panel.getByRole("list", { name: "Revizyon değişiklikleri" })).toContainText("MAT 2: A → B");
  await panel.getByLabel(/Gerekçe/).fill("Kitapçıkta 2. sorunun doğru cevabı B.");
  await panel.getByRole("button", { name: "Etkiyi önizle" }).click();
  await expect(panel.getByRole("status").filter({ hasText: "öğrencinin neti değişecek" })).toContainText("1 öğrencinin neti değişecek");
  await expect(panel.getByRole("table", { name: "Net değişimi" })).toContainText("2,00");

  const scan = await accessibilityScan(page).include("#anahtar-revizyonu").analyze();
  const blocking = scan.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
  expect(blocking, describeViolations(blocking)).toEqual([]);

  await panel.getByRole("button", { name: "Revizyonu uygula" }).click();
  await expect(panel.getByText("Revizyon uygulandı ve deneme yeniden puanlandı.")).toBeVisible();
  expect(Number((await prisma.odkAttemptScore.findUniqueOrThrow({ where: { attemptId } })).totalNet)).toBe(2);
  const revision = await prisma.odkAnswerKeyRevision.findFirstOrThrow({ where: { versionId } });
  expect([revision.revisionNumber, revision.previousAnswers, revision.nextAnswers]).toEqual([1, { [`${sectionId}-2`]: "A" }, { [`${sectionId}-2`]: "B" }]);
  await expect(panel.getByRole("list", { name: "Revizyon geçmişi" })).toContainText("MAT 2: A → B");
  await expect(panel.getByRole("list", { name: "Revizyon geçmişi" })).toContainText("yeniden puanlandı");
});
