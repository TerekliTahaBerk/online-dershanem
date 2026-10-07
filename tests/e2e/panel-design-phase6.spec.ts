import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { panelE2EAccounts } from "../../lib/e2e/panel-accounts";
import { loginAs } from "./helpers/panel-login";
import { accessibilityScan } from "./helpers/axe";

/**
 * DESIGN PHASE 6 — yönetim: Gelen kutusu (§13), Kişiler & Erişim (§14.1),
 * kişi detayı sekmeleri (§14.2–14.3) ve Öğrenci 360 üst sekmeleri + eski
 * sekme takma adları (§12).
 */

const prisma = new PrismaClient();
const admin = { ...panelE2EAccounts.admin, failureLabel: "ADMIN" };
const teacher = { ...panelE2EAccounts.teacher, failureLabel: "TEACHER" };
const SECOND_ADMIN_ID = "e2e-design-phase6-second-admin";

async function expectNoBlockingA11y(page: Page, label: string) {
  await page.waitForFunction(() =>
    document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getTiming().iterations === Infinity),
  );
  const results = await accessibilityScan(page).analyze();
  const blocking = results.violations.filter((violation) => ["critical", "serious"].includes(violation.impact || ""));
  expect(blocking, `${label} erişilebilirlik ihlalleri`).toEqual([]);
}

test.describe("Design Phase 6 — yönetim", () => {
  test.skip(!admin.password, "Panel E2E parolası tanımlı değil.");
  test.describe.configure({ mode: "serial" });
  test.afterAll(async () => {
    await prisma.mfaResetRequest.deleteMany({ where: { targetUserId: SECOND_ADMIN_ID } });
    await prisma.user.deleteMany({ where: { id: SECOND_ADMIN_ID } });
    await prisma.$disconnect();
  });

  test("Gelen kutusu önem sırasına göre gruplar ve alan süzgeci uygular; güvenlik satırı MFA kuyruğuna gider", async ({ page }) => {
    await prisma.user.upsert({
      where: { id: SECOND_ADMIN_ID },
      update: {},
      create: { id: SECOND_ADMIN_ID, email: "design-phase6-second-admin@example.com", passwordHash: "scrypt$disabled", mustChangePassword: false, role: "ADMIN", fullName: "Altıncı Faz Yönetici" },
    });
    await prisma.mfaResetRequest.deleteMany({ where: { targetUserId: SECOND_ADMIN_ID } });
    await prisma.mfaResetRequest.create({
      data: { targetUserId: SECOND_ADMIN_ID, requestedById: SECOND_ADMIN_ID, reason: "Cihaz değişti (E2E)", expiresAt: new Date(Date.now() + 30 * 60_000) },
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin);
    await page.goto("/panel/yonetim");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Gelen kutusu", level: 1 })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Sistem sağlığı" })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Bugün", exact: true })).toBeVisible();
    await expect(main.locator(".panel-metric-card")).toHaveCount(0);
    await expectNoBlockingA11y(page, "Gelen kutusu");

    const filters = page.getByRole("navigation", { name: "Gelen kutusu süzgeci" });
    await filters.getByRole("link", { name: /Güvenlik/ }).click();
    await expect(page).toHaveURL(/grup=SECURITY/);
    const row = main.getByRole("listitem").filter({ hasText: "Altıncı Faz Yönetici" });
    await expect(row.getByText("MFA sıfırlama onayı bekliyor", { exact: true })).toBeVisible();
    await expect(row.getByRole("link", { name: /^Onayla/ })).toHaveAttribute("href", "/panel/yonetim/kisiler#mfa-sifirlama");
  });

  test("Kişiler & Erişim görünümleri, süzgeçler ve yeni kişi paneli", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin);
    await page.goto("/panel/yonetim/kisiler");
    await expect(page.getByRole("heading", { name: "Kişiler", level: 1, exact: true })).toBeVisible();
    const views = page.getByRole("navigation", { name: "Kişi görünümleri" });
    await expect(views.getByRole("link", { name: "Öğrenciler" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("region", { name: /Bekleyen MFA sıfırlama onayı/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Toplu operasyon" })).toBeVisible();
    await expectNoBlockingA11y(page, "Kişiler");

    await views.getByRole("link", { name: "Koçlar" }).click();
    await expect(page).toHaveURL(/sekme=koclar/);
    await expect(page.getByRole("table", { name: "Koçlar" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Toplu operasyon" })).toHaveCount(0);

    await views.getByRole("link", { name: "Personel" }).click();
    await expect(page.getByRole("table", { name: "Personel" }).getByText("Tam yetki").first()).toBeVisible();

    // Eski liste bağlantısı (`kullanicilar?rol=`) yönlendirmeden sonra doğru görünüme düşer.
    await page.goto("/panel/yonetim/kullanicilar?rol=TEACHER");
    await expect(views.getByRole("link", { name: "Öğretmenler" })).toHaveAttribute("aria-current", "page");

    await page.goto("/panel/yonetim/kisiler?sekme=tumu&rol=ADMIN");
    // Akış sırasında gizli bir kopya bulunabilir; görünür olanı seç.
    await expect(page.locator('form[action="/panel/yonetim/kisiler"] select[name="rol"]').filter({ visible: true })).toHaveValue("ADMIN");
    await page.getByRole("link", { name: "Yeni kişi" }).click();
    const dialog = page.getByRole("dialog", { name: "Yeni kişi" });
    await expect(dialog).toBeVisible();
    await expectNoBlockingA11y(page, "Yeni kişi paneli");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("kişi detayı sekmeli: profil varsayılan, ürün erişimi nesneleri, güvenlik ve geçmiş", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin);
    await page.goto("/panel/yonetim/kullanicilar/e2e-user-student");
    const tabs = page.getByRole("navigation", { name: "Kişi detayı" });
    await expect(tabs.getByRole("link", { name: "Profil" })).toHaveAttribute("aria-current", "page");
    await expect(tabs.getByRole("link", { name: "Sorumluluklar" })).toHaveCount(0);
    await expect(page.getByRole("main").getByLabel("Değerlendirme ek süresi")).toBeVisible();

    await tabs.getByRole("link", { name: "Ürünler" }).click();
    await expect(page.getByRole("heading", { name: "Ürün erişimleri" })).toBeVisible();
    await expectNoBlockingA11y(page, "Kişi detayı · Ürünler");
    await tabs.getByRole("link", { name: "Güvenlik" }).click();
    await expect(page.getByText("Hesap durumu")).toBeVisible();
    await tabs.getByRole("link", { name: "Geçmiş" }).click();
    await expect(page.getByRole("heading", { name: "Geçmiş", level: 2 })).toBeVisible();

    await page.goto("/panel/yonetim/kullanicilar/e2e-user-teacher?sekme=sorumluluklar");
    await expect(tabs.getByRole("link", { name: "Sorumluluklar" })).toHaveAttribute("aria-current", "page");
    await expectNoBlockingA11y(page, "Kişi detayı · Sorumluluklar");
  });

  test("Öğrenci 360 üst sekmeleri; eski sekme değerleri takma adla doğru sekmeyi açar", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAs(page, admin);
    const base = "/panel/yonetim/ogrenciler/e2e-student-profile";
    await page.goto(base);
    const tabs = page.getByRole("navigation", { name: "Öğrenci profili sekmeleri" });
    await expect(tabs.getByRole("link", { name: "Genel" })).toHaveAttribute("aria-current", "page");
    for (const name of ["Öğrenme", "Etkinlik"]) await expect(tabs.getByRole("link", { name })).toBeVisible();
    await expect(page.getByRole("region", { name: "Öğretmenler ve veliler" })).toBeVisible();
    await expectNoBlockingA11y(page, "Öğrenci 360 · Genel");

    await page.goto(`${base}?sekme=dersler`);
    await expect(tabs.getByRole("link", { name: "Öğrenme" })).toHaveAttribute("aria-current", "page");
    await page.goto(`${base}?sekme=gelisim`);
    const learning = page.getByRole("navigation", { name: "Öğrenme görünümü" });
    await expect(learning.getByRole("link", { name: "Gelişim" })).toHaveAttribute("aria-current", "page");
    await learning.getByRole("link", { name: "Ödevler" }).click();
    await expect(page).toHaveURL(/sekme=ogrenme&gorunum=odevler/);

    await page.goto(`${base}?sekme=veli`);
    await expect(tabs.getByRole("link", { name: "Genel" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("region", { name: "Öğretmenler ve veliler" })).toBeVisible();

    await tabs.getByRole("link", { name: "Etkinlik" }).click();
    await expect(page).toHaveURL(/sekme=etkinlik/);
    await expect(page.getByRole("list", { name: "Etkinlik zaman çizelgesi" }).or(page.getByText("Henüz kayıtlı etkinlik yok."))).toBeVisible();
    await expectNoBlockingA11y(page, "Öğrenci 360 · Etkinlik");

    test.skip(!teacher.password, "Öğretmen E2E parolası tanımlı değil.");
    await loginAs(page, teacher);
    await page.goto("/panel/ogretmen/ogrenci/e2e-student-profile?sekme=dersler");
    await expect(page.getByRole("navigation", { name: "Öğrenci profili sekmeleri" }).getByRole("link", { name: "Öğrenme" })).toHaveAttribute("aria-current", "page");
    await expectNoBlockingA11y(page, "Öğretmen Öğrenci 360");
  });
});
