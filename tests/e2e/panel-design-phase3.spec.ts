import { expect, test } from "@playwright/test";
import { loginAs } from "./helpers/panel-login";
import { hasE2EEnv } from "./env-requirements";

/**
 * DESIGN PHASE 3 — Yön Koçluk: öğrenci Yön Bugün, Koçum, Hedeflerim; koç
 * çalışma alanı; yönetim koçluk kuyrukları ve atama yan paneli
 * (docs/panel-design-roadmap.md §10).
 */

const account = (role: "ADMIN" | "STUDENT" | "TEACHER") => ({
  email: process.env[`PANEL_E2E_${role}_EMAIL`]!,
  password: process.env[`PANEL_E2E_${role}_PASSWORD`]!,
  failureLabel: role,
});

test.describe("Design Phase 3 — Yön Koçluk", () => {
  test.skip(!hasE2EEnv("adminAccount", "studentAccount", "teacherAccount"), "E2E hesapları tanımlı değil");

  test("öğrenci Yön Bugün'de planı, görüşmeyi, haftayı, koç notunu ve hedefleri görür", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("STUDENT"));
    await page.goto("/panel/ogrenci/yon");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Bugün", level: 1 })).toBeVisible();
    for (const name of ["Bugünün planı", "Sıradaki görüşme", "Bu hafta", "Koçundan son not", "Hedeflerim"]) {
      await expect(main.getByRole("heading", { name, level: 2 })).toBeVisible();
    }
    // Koç ataması var: koç adı özellik satırında.
    await expect(main.getByRole("region", { name: "Sıradaki görüşme" }).getByText("Koç", { exact: true })).toBeVisible();
  });

  test("öğrenci Koçum ve Hedeflerim sayfaları kartsız bölümlerle açılır", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("STUDENT"));
    await page.goto("/panel/ogrenci/kocluk");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Koçum", level: 1 })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Ortak notlar", level: 2 })).toBeVisible();
    await expect(main.getByText("Hızlı erişim", { exact: true })).toHaveCount(0);

    await page.goto("/panel/ogrenci/hedefler");
    await expect(page.getByRole("main").getByRole("heading", { name: "Hedeflerim", level: 1 })).toBeVisible();
  });

  test("koç çalışma alanı bugünkü görüşmeleri, dikkat kuyruğunu ve öğrencileri gösterir", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("TEACHER"));
    await page.goto("/panel/ogretmen/yon");
    const main = page.getByRole("main");
    await expect(main.getByRole("heading", { name: "Bugün", level: 1 })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Bugünkü görüşmeler", level: 2 })).toBeVisible();
    await expect(main.getByRole("heading", { name: "Dikkat bekleyenler", level: 2 })).toBeVisible();
    const students = main.getByRole("table", { name: "Öğrencilerim" });
    await expect(students.getByRole("link", { name: "Ada Öğrenci" })).toHaveAttribute("href", /\/panel\/ogretmen\/hazirlik\//);
  });

  test("yönetim koçluk kuyrukları sekmelidir; koç atama yan panelde açılır ve Escape kapatır", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    await loginAs(page, account("ADMIN"));
    await page.goto("/panel/yonetim/kocluk?kuyruk=hedefsiz");
    const tabs = page.getByRole("navigation", { name: "Koçluk kuyrukları" });
    await expect(tabs.getByRole("link", { name: /Hedefi olmayan/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("table", { name: "Koç dizini" })).toBeVisible();

    await page.goto("/panel/yonetim/kocluk?kuyruk=geciken&onizle=ata:e2e-student-profile");
    await page.waitForLoadState("networkidle");
    const drawer = page.getByRole("dialog", { name: "Koçu devret" });
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("radio").first()).toBeVisible();
    await expect(drawer.getByLabel("Kapasite aşımı gerekçesi")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await expect(page).not.toHaveURL(/onizle=/);
  });
});
