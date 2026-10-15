import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { accessibilityScan, describeViolations } from "./helpers/axe";
import { loginAs } from "./helpers/panel-login";

/**
 * Faz 5 / P1-3 — yönetici, öğrencinin göreceği gerçek çözücüyü önizler:
 * oturum soruları, cevap seçme, oturum geçişi ve teslim önizlemede çalışır;
 * hiçbir öğrenci ucu çağrılmaz ve attempt/cevap yazılmaz.
 */

const prisma = new PrismaClient();
const examId = "e2e-odk-exam-lgs";
const account = panelE2EAccounts.admin;

test.afterAll(async () => prisma.$disconnect());

test("yönetici LGS çözücüsünü oturum oturum önizler; hiçbir şey yazılmaz", async ({ page }) => {
  test.skip(!account.password, "Admin E2E parolası tanımlı değil.");
  test.setTimeout(90_000);
  const attemptsBefore = await prisma.odkExamAttempt.count({ where: { examId } });
  const studentCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/odk/student/")) studentCalls.push(request.url());
  });

  await loginAs(page, account);
  await page.goto(`/panel/odk/yonetim/sinavlar/${examId}?sekme=onizleme`);
  await page.getByRole("link", { name: "Sözel oturumunu önizle" }).click();
  await page.waitForURL(new RegExp(`/onizleme/cozucu\\?oturum=SOZEL$`));
  await expect(page.getByText("Önizleme: öğrencinin göreceği ekran.")).toBeVisible();
  await expect(page.getByText("Deneme Ligi · Sözel oturumu")).toBeVisible();
  // Yalnız Sözel soruları (TR 1–2); Sayısal (3–4) listede yok.
  await expect(page.getByRole("button", { name: /^Soru 2,/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Soru 3,/ })).toHaveCount(0);

  await page.getByRole("button", { name: "B", exact: true }).click();
  await expect(page.getByRole("button", { name: "B", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible();

  const scan = await accessibilityScan(page).analyze();
  const blocking = scan.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
  expect(blocking, describeViolations(blocking)).toEqual([]);

  // Oturumu bitir → Sayısal önizlemesi; Sözel kilitli görünür.
  await page.getByRole("button", { name: "Oturumu bitir" }).click();
  await page.getByRole("button", { name: "Oturumu kapat" }).click();
  await page.waitForURL(new RegExp(`/onizleme/cozucu\\?oturum=SAYISAL$`));
  await expect(page.getByText("Deneme Ligi · Sayısal oturumu")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Soru 3,/ })).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Denemeyi teslim et" }).click();
  await page.waitForURL(new RegExp(`/panel/odk/yonetim/sinavlar/${examId}\\?sekme=onizleme$`));

  expect(studentCalls).toEqual([]);
  expect(await prisma.odkExamAttempt.count({ where: { examId } })).toBe(attemptsBefore);
});
