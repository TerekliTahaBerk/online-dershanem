import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { loginAs } from "./helpers/panel-login";
import { accessibilityScan } from "./helpers/axe";

/**
 * DESIGN PHASE 5 — Deneme Ligi personel çalışma alanı
 * (docs/panel-design-roadmap.md §11.7, §11.8, §15). İzin filtresi saf
 * kurallarda (`lib/odk/staff-workspace.test.ts`) her rol için test edilir; bu
 * dosya ADMIN (tüm izinler) ve rapor okuyucu öğretmenle ekranları doğrular.
 */

const prisma = new PrismaClient();
const examId = "e2e-odk-exam-live";
const lgsExamId = "e2e-odk-exam-lgs";
const studentUserId = "e2e-user-odk-student";
const admin = { ...panelE2EAccounts.admin, failureLabel: "ADMIN" };
const teacher = { ...panelE2EAccounts.teacher, failureLabel: "TEACHER" };

async function openLiveWindow() {
  await prisma.odkExam.update({
    where: { id: examId },
    data: { status: "SCHEDULED", startsAt: new Date(Date.now() - 2 * 60_000), endsAt: new Date(Date.now() + 60 * 60_000), resultsReleasedAt: null, answerKeyReleasedAt: null },
  });
  await prisma.odkExamAttempt.deleteMany({ where: { examId, studentUserId } });
  await prisma.odkExamAttempt.create({
    data: { id: "e2e-odk-attempt-live", examId, versionId: "e2e-odk-version-live", studentUserId, attemptNumber: 1, status: "IN_PROGRESS", startedAt: new Date(), deadlineAt: new Date(Date.now() + 45 * 60_000), lastActivityAt: new Date() },
  });
}

/**
 * Yan panel URL'ye bağlıdır: tıklamayla açıldığı doğrulandıktan sonra aynı URL
 * yeniden yüklenir ve tarama tam belge üzerinde yapılır (istemci geçişinde
 * akışla gelen başlık meta verisi zamanlamaya bağlı geç gelebiliyor).
 */
async function reloadWithDrawer(page: Page) {
  await page.reload();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function expectNoBlockingA11y(page: Page, label: string) {
  // Yan panelin açılış animasyonu sürerken renkler karışık ölçülür; bitmesini bekle
  // (canlı rozetinin sonsuz nabzı hariç).
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity),
  );
  const results = await accessibilityScan(page).analyze();
  const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
  expect(blocking, `${label} erişilebilirlik ihlalleri`).toEqual([]);
}

async function expectNoHorizontalOverflow(page: Page, label: string) {
  const overflow = await page.evaluate(() =>
    Math.max(document.documentElement.scrollWidth - document.documentElement.clientWidth, document.body.scrollWidth - document.body.clientWidth),
  );
  expect(overflow, `${label} yatay taşma`).toBeLessThanOrEqual(1);
}

test.describe("Design Phase 5 — Deneme Ligi personel", () => {
  test.skip(!admin.password, "Panel E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });
  test.beforeAll(openLiveWindow);
  test.afterAll(async () => {
    await openLiveWindow();
    await prisma.$disconnect();
  });

  test("tek personel ana sayfası: dikkat, yaklaşan, canlı, etkinlik; yeni deneme diyaloğu aynı panelde seri adımı açar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin, { panel: "ODK" });
    await page.goto("/panel/odk/yonetim");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Deneme Ligi", level: 1 })).toBeVisible();
    for (const name of ["Dikkat bekleyenler", "Yaklaşan", "Canlı şimdi", "Son etkinlik", "Çalışma alanları"]) {
      await expect(main.getByRole("heading", { name, level: 2 })).toBeVisible();
    }
    await expect(main.locator(".panel-metric-card")).toHaveCount(0);
    await expect(main.getByRole("list", { name: "Canlı denemeler" }).getByRole("link", { name: /E2E Canlı Matematik Denemesi/ })).toHaveAttribute(
      "href",
      `/panel/odk/yonetim/operasyon?deneme=${examId}`,
    );
    await expect(main.getByRole("list", { name: "Çalışma alanları" }).getByRole("link", { name: /Pilot hazırlığı/ })).toBeVisible();
    await expectNoBlockingA11y(page, "Personel ana sayfası");

    await main.getByRole("link", { name: "Yeni deneme" }).click();
    await expect(page).toHaveURL(/\/panel\/odk\/yonetim\/sinavlar\?yeni=1/);
    const dialog = page.getByRole("dialog", { name: "Yeni deneme" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel("Tür")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Taslak oluştur" })).toBeVisible();
    await expectNoBlockingA11y(page, "Yeni deneme diyaloğu");
    await dialog.getByRole("button", { name: "Yeni seri" }).click();
    const seriesDialog = page.getByRole("dialog", { name: "Yeni seri" });
    await expect(seriesDialog.getByRole("button", { name: "Seri oluştur" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await seriesDialog.getByRole("button", { name: "Denemeye dön" }).click();
    await expect(page.getByRole("dialog", { name: "Yeni deneme" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).not.toHaveURL(/yeni=/);
  });

  test("Denemeler kayıtlı görünümlerle süzülür; ADMIN varsayılanı Tümü", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin, { panel: "ODK" });
    await page.goto("/panel/odk/yonetim/sinavlar");
    const views = page.getByRole("navigation", { name: "Deneme görünümleri" });
    await expect(views.getByRole("link", { name: /Tümü/ })).toHaveAttribute("aria-current", "page");
    await views.getByRole("link", { name: /^Canlı/ }).click();
    await expect(page).toHaveURL(/gorunum=canli/);
    const table = page.getByRole("table", { name: /Denemeler · Canlı/ });
    await expect(table.getByRole("link", { name: "E2E Canlı Matematik Denemesi", exact: true })).toHaveAttribute("href", `/panel/odk/yonetim/sinavlar/${examId}`);
    await expect(table.getByRole("link", { name: "Canlı izle · E2E Canlı Matematik Denemesi" })).toHaveAttribute("href", `/panel/odk/yonetim/operasyon?deneme=${examId}`);
    await expectNoBlockingA11y(page, "Denemeler");
    // Eski `?durum=` süzgeci çalışmaya devam eder.
    await page.goto("/panel/odk/yonetim/sinavlar?durum=SCHEDULED");
    await expect(views.getByRole("link", { name: /Tümü/ })).toHaveAttribute("aria-current", "page");
  });

  test("deneme çalışma alanı sekmeli; hazırlık rayı, eski çapa sekmeye eşlenir, Oturumlar ve Geçmiş görünür", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin, { panel: "ODK" });
    await page.goto(`/panel/odk/yonetim/sinavlar/${examId}`);
    const tabs = page.getByRole("navigation", { name: "Deneme çalışma alanı" });
    await expect(tabs.getByRole("link", { name: "Genel" })).toHaveAttribute("aria-current", "page");
    for (const name of ["İçerik", "Sorular", "Zamanlama", "Katılımcılar", "Önizleme", "Canlı", "Puanlama ve yayın", "Bütünlük", "Raporlar", "Geçmiş"]) {
      await expect(tabs.getByRole("link", { name, exact: true })).toBeVisible();
    }
    // Oturum planı olmayan denemede Oturumlar sekmesi çizilmez.
    await expect(tabs.getByRole("link", { name: "Oturumlar" })).toHaveCount(0);
    const rail = page.getByRole("complementary", { name: /Hazırlık durumu/ });
    await expect(rail).toBeVisible();
    await expect(rail.getByText("Cevap anahtarı")).toBeVisible();
    await expectNoBlockingA11y(page, "Çalışma alanı · Genel");

    // Başka sayfadan gelen eski çapa bağlantısı (ör. `#adim-sonuc`) doğru sekmeyi açar.
    await page.goto("/panel/odk/yonetim/sinavlar");
    await page.goto(`/panel/odk/yonetim/sinavlar/${examId}#adim-sonuc`);
    await expect(page).toHaveURL(/sekme=puanlama/);
    await expect(tabs.getByRole("link", { name: "Puanlama ve yayın" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("heading", { name: "Puanlama kısayolu" })).toBeVisible();

    await tabs.getByRole("link", { name: "Canlı", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Canlı durum" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Canlı operasyonda aç" })).toHaveAttribute("href", `/panel/odk/yonetim/operasyon?deneme=${examId}`);

    await tabs.getByRole("link", { name: "Geçmiş" }).click();
    await expect(page.getByText("Taslak oluşturuldu").first()).toBeVisible();

    await page.goto(`/panel/odk/yonetim/sinavlar/${lgsExamId}?sekme=oturumlar`);
    await expect(page.getByRole("heading", { name: "Oturumlar", level: 2 })).toBeVisible();
    await expect(page.getByLabel("Sözel oturumu süresi (dakika)").filter({ visible: true })).toHaveValue("75");
    await expect(page.getByLabel("Sözel sonrası ara (dakika)").filter({ visible: true })).toHaveValue("45");
    await expectNoBlockingA11y(page, "Çalışma alanı · Oturumlar");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/panel/odk/yonetim/sinavlar/${examId}`);
    await expectNoHorizontalOverflow(page, "Çalışma alanı 390");
  });

  test("canlı operasyon konsolu: sayaçlar, yoğun tablo, uyarılar ve kayıt yan paneli", async ({ page }) => {
    await openLiveWindow();
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin, { panel: "ODK" });
    await page.goto(`/panel/odk/yonetim/operasyon?deneme=${examId}`);
    const counters = page.getByLabel("Canlı sayaçlar").filter({ visible: true });
    for (const label of ["Başlamadı", "Devam ediyor", "Bağlantı koptu", "Teslim", "Otomatik teslim", "İnceleme"]) {
      await expect(counters.getByText(label, { exact: true })).toBeVisible();
    }
    const region = page.getByRole("region", { name: "Deneme kayıtları" });
    const rowLink = region.getByRole("link").first();
    await expect(rowLink).toBeVisible();
    await expect(page.getByRole("complementary", { name: /Uyarılar/ })).toBeVisible();
    await expectNoBlockingA11y(page, "Canlı operasyon");

    await rowLink.click();
    await expect(page).toHaveURL(/onizle=kayit%3A|onizle=kayit:/);
    const drawer = page.getByRole("dialog");
    await expect(drawer.getByRole("heading", { name: "Olaylar" })).toBeVisible();
    await expect(drawer.getByRole("button", { name: "İncelendi olarak işaretle" })).toBeVisible();
    await reloadWithDrawer(page);
    await expectNoBlockingA11y(page, "Kayıt yan paneli");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/panel/odk/yonetim/operasyon?deneme=${examId}`);
    await expectNoHorizontalOverflow(page, "Canlı operasyon 390");
  });

  test("Puanlama ve yayın kuyruğu ile paket sözleşmesi tablosu", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin, { panel: "ODK" });
    await page.goto("/panel/odk/yonetim/sonuclar");
    await expect(page.getByRole("heading", { name: "Puanlama ve yayın", level: 1 })).toBeVisible();
    const stages = page.getByRole("navigation", { name: "Yayın akışı aşamaları" });
    await expect(stages.getByRole("link", { name: /İş kuyruğu/ })).toHaveAttribute("aria-current", "page");
    await stages.getByRole("link", { name: /^Tümü/ }).click();
    await expect(page).toHaveURL(/asama=tumu/);
    await expectNoBlockingA11y(page, "Puanlama ve yayın");

    await page.goto("/panel/odk/yonetim/paketler");
    await expect(page.getByRole("heading", { name: "Deneme Ligi paketleri", level: 1 })).toBeVisible();
    const firstPackage = page.getByRole("table", { name: "Deneme Ligi paketleri" }).getByRole("link").first();
    if (await firstPackage.count()) {
      await firstPackage.click();
      await expect(page.getByRole("dialog").getByText("Paket → hak → deneme eşlemesi")).toBeVisible();
      await reloadWithDrawer(page);
      await expectNoBlockingA11y(page, "Paket yan paneli");
      await page.keyboard.press("Escape");
    }
  });

  test("öğretmen sonuç raporu tablo + yan panel; tam rapor eski ayrıntılı görünümü açar", async ({ page }) => {
    test.skip(!teacher.password, "Öğretmen E2E parolası tanımlı değil.");
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, teacher, { panel: null });
    await page.goto("/panel/odk/ogretmen/raporlar");
    await expect(page.getByRole("heading", { name: "Sonuç raporları", level: 1 })).toBeVisible();
    await expectNoBlockingA11y(page, "Öğretmen sonuç raporları");
    const table = page.getByRole("table", { name: "Sonuç raporları" });
    if (await table.count()) {
      await table.getByRole("link").first().click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await table.getByRole("link", { name: /Tam rapor/ }).first().click();
      await expect(page).toHaveURL(/ogrenci=/);
      await expect(page.getByRole("link", { name: "Tüm öğrenciler" })).toBeVisible();
    }

    await loginAs(page, admin, { panel: "ODK" });
    await page.goto("/panel/odk/yonetim/raporlar");
    await expect(page.getByRole("heading", { name: "Sonuç raporları", level: 1 })).toBeVisible();
    await expectNoBlockingA11y(page, "Yönetim sonuç raporları");
  });
});
