import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAs } from "./helpers/panel-login";
import { hasE2EEnv } from "./env-requirements";

/**
 * DESIGN PHASE 0 — kaybolan / yetim panel yeteneklerinin geri dönüşü.
 * (docs/panel-design-roadmap.md §19, §22)
 *
 * - Çift kontrollü MFA sıfırlama onay kuyruğu yalnız yönlendirilen
 *   `/panel/yonetim/kullanicilar` listesindeydi; artık `/panel/yonetim/kisiler`'de.
 * - Giriş noktası olmayan sayfalar menüye bağlandı.
 */

const db = new PrismaClient();
const SECOND_ADMIN_ID = "e2e-design-phase0-second-admin";

const account = (role: "ADMIN" | "STUDENT") => ({
  email: process.env[`PANEL_E2E_${role}_EMAIL`]!,
  password: process.env[`PANEL_E2E_${role}_PASSWORD`]!,
  failureLabel: role,
});

test.describe.serial("Design Phase 0 — geri getirilen yetenekler", () => {
  test.skip(!hasE2EEnv("adminAccount", "studentAccount"), "E2E hesapları tanımlı değil");

  test.afterAll(async () => {
    await db.mfaResetRequest.deleteMany({ where: { targetUserId: SECOND_ADMIN_ID } });
    await db.user.deleteMany({ where: { id: SECOND_ADMIN_ID } });
    await db.$disconnect();
  });

  test("bekleyen MFA sıfırlama isteği Kişiler sayfasında onaylanabilir görünür", async ({ page }) => {
    // İsteği başka bir yönetici açmış olsun: görüntüleyen yönetici ne hedef ne
    // de isteyen olduğu için onay düğmesini görmelidir.
    await db.user.upsert({
      where: { id: SECOND_ADMIN_ID },
      update: {},
      create: {
        id: SECOND_ADMIN_ID,
        email: "design-phase0-second-admin@example.com",
        passwordHash: "scrypt$disabled",
        mustChangePassword: false,
        role: "ADMIN",
        fullName: "İkinci Yönetici",
      },
    });
    await db.mfaResetRequest.deleteMany({ where: { targetUserId: SECOND_ADMIN_ID } });
    await db.mfaResetRequest.create({
      data: {
        targetUserId: SECOND_ADMIN_ID,
        requestedById: SECOND_ADMIN_ID,
        reason: "Telefon kayboldu (E2E)",
        expiresAt: new Date(Date.now() + 30 * 60_000),
      },
    });

    await loginAs(page, account("ADMIN"));
    await page.goto("/panel/yonetim/kisiler");
    const queue = page.getByRole("region", { name: /Bekleyen MFA sıfırlama onayı/ });
    await expect(queue).toBeVisible();
    await expect(queue.getByText("İkinci Yönetici", { exact: true })).toBeVisible();
    await expect(queue.getByText("Telefon kayboldu (E2E)")).toBeVisible();
    await expect(queue.getByRole("button", { name: /onayla/i })).toBeVisible();
  });

  test("yönetim menüsü yetim sayfalara ve Deneme Ligi puanlamasına bağlanır", async ({ page }) => {
    await loginAs(page, account("ADMIN"));
    await page.goto("/panel/yonetim");
    const nav = page.getByRole("navigation", { name: "Panel menüsü" }).first();
    await expect(nav.getByRole("link", { name: "Kontrollü yayın", exact: true })).toHaveAttribute("href", "/panel/yonetim/pilot");
    await expect(nav.getByRole("link", { name: "Öğrenme kalitesi", exact: true })).toHaveAttribute("href", "/panel/yonetim/kalite");
    await expect(nav.getByRole("link", { name: "Aktivasyon masası", exact: true })).toBeVisible();

    await page.goto("/panel/odk/yonetim");
    const odkNav = page.getByRole("navigation", { name: "Panel menüsü" }).first();
    await expect(odkNav.getByRole("link", { name: "Puanlama ve yayın", exact: true })).toHaveAttribute("href", "/panel/odk/yonetim/sonuclar");
    await expect(odkNav.getByRole("link", { name: "Deneme Ligi kontrollü yayın", exact: true })).toBeVisible();
    await expect(odkNav.getByText(/kulüp/i)).toHaveCount(0);
  });

  test("öğrenci haftalık özete menüden ulaşır", async ({ page }) => {
    await loginAs(page, account("STUDENT"));
    await page.goto("/panel/ogrenci");
    const nav = page.getByRole("navigation", { name: "Panel menüsü" }).first();
    await expect(nav.getByRole("link", { name: "Haftalık özet", exact: true })).toHaveAttribute("href", "/panel/ogrenci/haftalik");
  });
});
