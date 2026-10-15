import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { accessibilityScan, describeViolations } from "./helpers/axe";
import { loginAs } from "./helpers/panel-login";

/**
 * Çoklu kitapçık — yönetici B kitapçığı sırasını tablo yapıştırarak tanımlar,
 * önizler, kaydeder; çözücü önizlemesi kitapçık başına açılır. Test kendi
 * taslak denemesini kurar ve siler.
 */

const prisma = new PrismaClient();
const examId = "e2e-odk-multi-booklet";
const versionId = "e2e-odk-multi-booklet-v1";
const account = panelE2EAccounts.admin;

test.describe("ODK çoklu kitapçık", () => {
  test.skip(!account.password, "Admin E2E parolası tanımlı değil.");

  test.beforeAll(async () => {
    await prisma.odkExam.updateMany({ where: { id: examId }, data: { currentVersionId: null } });
    await prisma.odkExam.deleteMany({ where: { id: examId } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
    const policy = await prisma.odkScoringPolicy.findUniqueOrThrow({ where: { code: "TYT_FULL_V1" } });
    await prisma.odkExam.create({ data: { id: examId, title: "E2E Çoklu Kitapçık", slug: examId, family: "TYT", structureMode: "FULL_TEMPLATE", createdById: admin.id } });
    await prisma.odkExamVersion.create({ data: { id: versionId, examId, versionNumber: 1, durationMinutes: 60, scoringPolicyId: policy.id, createdById: admin.id } });
    await prisma.odkExam.update({ where: { id: examId }, data: { currentVersionId: versionId } });
    const section = await prisma.odkExamSection.create({ data: { id: `${versionId}-MAT`, versionId, code: "MAT", title: "Temel Matematik", position: 0, questionCount: 3 } });
    await prisma.odkExamQuestion.createMany({ data: [1, 2, 3].map((number) => ({ id: `${section.id}-${number}`, sectionId: section.id, questionNumber: number, position: number - 1 })) });
  });

  test.afterAll(async () => {
    await prisma.odkExam.updateMany({ where: { id: examId }, data: { currentVersionId: null } });
    await prisma.odkExam.deleteMany({ where: { id: examId } });
    await prisma.$disconnect();
  });

  test("B kitapçığı sırası yapıştırılır, önizlenir, kaydedilir; çözücü B için açılır", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, account);
    await page.goto(`/panel/odk/yonetim/sinavlar/${examId}?sekme=icerik`);
    const panel = page.getByRole("region", { name: "Kitapçık türleri" });
    await expect(panel.getByText("Tek kitapçık (A).")).toBeVisible();

    const table = panel.getByRole("textbox", { name: "Kitapçık sırası tablosu" });
    // Eksik satır → sunucu önizlemesi INCOMPLETE_BOOKLET.
    await table.fill("B;MAT;1;3\nB;MAT;2;2");
    await panel.getByRole("button", { name: "Kitapçık sırasını önizle" }).click();
    await expect(panel.getByRole("list", { name: "Kitapçık sırası sorunları" })).toContainText("1 sorusu eşlenmedi");
    await expect(panel.getByRole("button", { name: "Kitapçık sırasını kaydet" })).toBeDisabled();

    await table.fill("Kitapçık;Bölüm;Kitapçık no;A no\nB;Temel Matematik;1;3\nB;MAT;2;2\nB;MAT;3;1");
    await panel.getByRole("button", { name: "Kitapçık sırasını önizle" }).click();
    await expect(panel.getByRole("status").filter({ hasText: "Geçerli: B (3/3 soru)" })).toBeVisible();

    const scan = await accessibilityScan(page).analyze();
    const blocking = scan.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
    expect(blocking, describeViolations(blocking)).toEqual([]);

    await panel.getByRole("button", { name: "Kitapçık sırasını kaydet" }).click();
    await expect(panel.getByText("A, B kitapçıkları tanımlı.")).toBeVisible();
    const rows = await prisma.odkBookletQuestionOrder.findMany({ where: { versionId }, orderBy: { bookletQuestionNumber: "asc" } });
    expect(rows.map((row) => row.questionId)).toEqual([`${versionId}-MAT-3`, `${versionId}-MAT-2`, `${versionId}-MAT-1`]);

    await page.goto(`/panel/odk/yonetim/sinavlar/${examId}?sekme=onizleme`);
    await page.getByRole("link", { name: "Çözücüyü önizle (B)" }).click();
    await page.waitForURL(/\/onizleme\/cozucu\?kitapcik=B$/);
    await expect(page.getByText(/B kitapçığı/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Soru 3,/ })).toBeVisible();
  });
});
