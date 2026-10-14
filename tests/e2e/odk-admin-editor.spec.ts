import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { accessibilityScan, describeViolations } from "./helpers/axe";
import { loginAs } from "./helpers/panel-login";

/**
 * Faz 4 (docs/roadmaps/odk-exam-experience-overhaul.md) — yönetici soru
 * çalışma alanı: bölüm sekmeleri, optik klavye girişi, kaydetme, eşzamanlı
 * düzenleme çakışması ve tablo yapıştırarak içe aktarma (satır hatası +
 * "Soruya git"). Test kendi taslak denemesini kurar ve siler.
 */

const prisma = new PrismaClient();
const examId = "e2e-odk-editor-draft";
const versionId = "e2e-odk-editor-draft-v1";
const account = panelE2EAccounts.admin;

test.describe("ODK yönetici soru çalışma alanı", () => {
  test.skip(!account.password, "Admin E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    await prisma.odkExam.deleteMany({ where: { id: examId } });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: account.email } });
    const policy = await prisma.odkScoringPolicy.findUniqueOrThrow({ where: { code: "TYT_FULL_V1" } });
    await prisma.odkExam.create({ data: { id: examId, title: "E2E Editör Taslak", slug: "e2e-odk-editor-draft", family: "TYT", structureMode: "FULL_TEMPLATE", createdById: admin.id } });
    await prisma.odkExamVersion.create({ data: { id: versionId, examId, versionNumber: 1, durationMinutes: 60, scoringPolicyId: policy.id, createdById: admin.id } });
    await prisma.odkExam.update({ where: { id: examId }, data: { currentVersionId: versionId } });
    for (const [position, [code, title, count]] of ([["MAT", "Temel Matematik", 3], ["FEN", "Fen Bilimleri", 2]] as const).entries()) {
      const section = await prisma.odkExamSection.create({ data: { id: `${versionId}-${code}`, versionId, code, title, position, questionCount: count } });
      await prisma.odkExamQuestion.createMany({ data: Array.from({ length: count }, (_, index) => ({ id: `${section.id}-${index + 1}`, sectionId: section.id, questionNumber: index + 1, position: index })) });
    }
  });

  test.afterAll(async () => {
    await prisma.odkExam.updateMany({ where: { id: examId }, data: { currentVersionId: null } });
    await prisma.odkExam.deleteMany({ where: { id: examId } });
    await prisma.$disconnect();
  });

  test("optik klavye girişi kaydedilir; araya giren düzenleme çakışma olarak yakalanır", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, account);
    await page.goto(`/panel/odk/yonetim/sinavlar/${examId}?sekme=sorular`);
    await expect(page.getByRole("button", { name: /Temel Matematik/ })).toBeVisible();
    await expect(page.getByRole("rowheader", { name: "FEN 2" })).toBeVisible();

    const scan = await accessibilityScan(page).analyze();
    const blocking = scan.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
    expect(blocking, describeViolations(blocking)).toEqual([]);

    await page.getByRole("button", { name: "Optik giriş" }).click();
    await page.getByRole("radiogroup", { name: "Soru MAT 1 doğru cevap (optik)" }).focus();
    await page.keyboard.type("acb");
    await expect(page.getByRole("radiogroup", { name: "Soru MAT 3 doğru cevap (optik)" }).getByRole("radio", { name: "B" })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("radiogroup", { name: "Soru FEN 1 doğru cevap (optik)" })).toBeFocused();
    await expect(page.getByText("Kaydedilmemiş değişiklikler var.")).toBeVisible();
    await page.getByRole("button", { name: "Soruları kaydet" }).click();
    await expect(page.getByText("Cevaplar ve kazanımlar kaydedildi.")).toBeVisible();
    const saved = await prisma.odkExamQuestion.findMany({ where: { section: { versionId } }, orderBy: [{ section: { position: "asc" } }, { position: "asc" }] });
    expect(saved.map((row) => row.correctOption)).toEqual(["A", "C", "B", null, null]);

    // Başka bir yönetici aynı anda FEN 2'yi kaydeder.
    await prisma.odkExamQuestion.update({ where: { id: `${versionId}-FEN-2` }, data: { correctOption: "E" } });
    await page.getByRole("radiogroup", { name: "Soru FEN 1 doğru cevap (optik)" }).focus();
    await page.keyboard.press("d");
    await page.getByRole("button", { name: "Soruları kaydet" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "başka biri tarafından" }).first()).toBeVisible();
    const after = await prisma.odkExamQuestion.findMany({ where: { section: { versionId } }, orderBy: [{ section: { position: "asc" } }, { position: "asc" }] });
    expect(after.map((row) => row.correctOption)).toEqual(["A", "C", "B", null, "E"]);
  });

  test("tablo yapıştırma: satır hatası gösterilir; eksik soru önizlemede 'Soruya git' ile listelenir; tam anahtar yazılır", async ({ page }) => {
    test.setTimeout(90_000);
    await loginAs(page, account);
    await page.goto(`/panel/odk/yonetim/sinavlar/${examId}?sekme=icerik`);
    const input = page.getByRole("textbox", { name: "İçe aktarılacak içerik" });

    await input.fill("Bölüm\tSoru\tCevap\nMAT\t1\tZ");
    await page.getByRole("button", { name: "Önizle" }).click();
    await expect(page.getByRole("list", { name: "Satır hataları" })).toContainText("satır 2");

    await input.fill("Temel Matematik: ACB");
    await page.getByRole("button", { name: "Önizle" }).click();
    const issues = page.getByRole("list", { name: "Önizleme sorunları" });
    await expect(issues).toContainText("FEN 1");
    await expect(issues.getByRole("link", { name: "Soruya git" }).first()).toHaveAttribute("href", new RegExp(`sekme=sorular&bolum=FEN#soru-FEN-1$`));
    await expect(page.getByRole("button", { name: "Onayla ve yaz" })).toBeDisabled();
    const scan = await accessibilityScan(page).analyze();
    const blocking = scan.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
    expect(blocking, describeViolations(blocking)).toEqual([]);

    await input.fill("MAT: ACB\nFEN;1;D\nFEN;2;E");
    await page.getByRole("button", { name: "Önizle" }).click();
    await page.getByRole("button", { name: "Onayla ve yaz" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Kaydedildi · 5 soru" })).toBeVisible();
    const saved = await prisma.odkExamQuestion.findMany({ where: { section: { versionId } }, orderBy: [{ section: { position: "asc" } }, { position: "asc" }] });
    expect(saved.map((row) => row.correctOption)).toEqual(["A", "C", "B", "D", "E"]);
  });
});
