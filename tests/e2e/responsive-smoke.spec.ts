import { expect, test, type Page } from "@playwright/test";
import { loginAs } from "./helpers/panel-login";
import { expectNoHorizontalOverflow } from "./helpers/responsive";

async function gotoHydrated(page: Page, path: string) {
  await page.goto(path);
  await page.waitForFunction(() => {
    const button = document.querySelector("header button");
    return !!button && Object.keys(button).some((key) => key.startsWith("__reactFiber$"));
  });
}

const publicViewports = [
  { width: 375, height: 812 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
] as const;

const publicRoutes = ["/", "/paketler", "/urunler/online-deneme-kulubum"] as const;

test.describe("public responsive smoke", () => {
  for (const viewport of publicViewports) {
    test(`public routes no overflow @${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      for (const route of publicRoutes) {
        await page.goto(route, { waitUntil: "domcontentloaded" });
        await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
        await expectNoHorizontalOverflow(page, `${route} @${viewport.width}`);
      }
    });
  }

  test("mobile header and hero ctas stay accessible @375", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await gotoHydrated(page, "/");
    await page.getByRole("button", { name: "Menüyü aç" }).click();
    const dialog = page.getByRole("dialog", { name: "Mobil menü" });
    await expect(dialog.getByRole("link", { name: "Paketini Oluştur", exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Menüyü kapat" }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Paketini Oluştur", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Ürünleri Karşılaştır", exact: true })).toBeVisible();
  });
});

const accounts = {
  student: {
    email: process.env.PANEL_E2E_STUDENT_EMAIL,
    password: process.env.PANEL_E2E_STUDENT_PASSWORD,
  },
  teacher: {
    email: process.env.PANEL_E2E_TEACHER_EMAIL,
    password: process.env.PANEL_E2E_TEACHER_PASSWORD,
  },
  parent: {
    email: process.env.PANEL_E2E_PARENT_EMAIL,
    password: process.env.PANEL_E2E_PARENT_PASSWORD,
  },
  admin: {
    email: process.env.PANEL_E2E_ADMIN_EMAIL,
    password: process.env.PANEL_E2E_ADMIN_PASSWORD,
  },
} as const;

const panelEntryRoutes = {
  student: "/panel/ogrenci",
  teacher: "/panel/ogretmen",
  parent: "/panel/veli",
  admin: "/panel/yonetim",
} as const;

test.describe("panel responsive smoke", () => {
  test.skip(
    !Object.values(accounts).every((account) => account.email && account.password),
    "Panel E2E hesapları tanımlı değil.",
  );

  for (const [role, fixture] of Object.entries(accounts) as Array<
    [keyof typeof accounts, (typeof accounts)[keyof typeof accounts]]
  >) {
    test(`${role} mobile shell keeps nav usable @375`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 });
      await loginAs(page, {
        email: fixture.email!,
        password: fixture.password!,
        failureLabel: `${role} responsive fixture:`,
      });
      if (new URL(page.url()).pathname === "/panel/urun-sec") {
        await page.goto(panelEntryRoutes[role]);
      }
      await page.goto(panelEntryRoutes[role]);
      await expect(page.getByRole("main")).toBeVisible();
      await expectNoHorizontalOverflow(page, `${role} panel @375`);

      const quickNav = page.getByRole("navigation", { name: "Mobil hızlı menü" });
      await expect(quickNav).toBeVisible();
      await expect(quickNav.getByRole("button", { name: "Panel menüsünü aç" })).toBeVisible();
      await quickNav.getByRole("button", { name: "Panel menüsünü aç" }).click();
      const drawer = page.getByRole("dialog", { name: "Panel menüsü" });
      await expect(drawer.getByRole("navigation", { name: "Panel menüsü" })).toBeVisible();
    });
  }
});
