import { PrismaClient } from "@prisma/client";
import { expect, test, type Page } from "@playwright/test";
import { uniqueTestClientIp } from "./helpers/client-ip";

/**
 * Müfredat kataloğu önbelleği (`lib/curriculum/catalog-cache.ts`).
 *
 * İki şeyi birlikte kanıtlar:
 *  1. Önbellek gerçekten devrede: route'u atlayan doğrudan DB yazımı,
 *     sayfa yenilense de GÖRÜNMEZ (aksi halde test boşuna geçerdi).
 *  2. Invalidation doğru yerde: müfredat API'si üzerinden yapılan yazım
 *     `revalidateTag` tetikler ve bir sonraki istek iki yazımı da gösterir.
 */

const prisma = new PrismaClient();
const adminEmail = process.env.PANEL_E2E_ADMIN_EMAIL;
const adminPassword = process.env.PANEL_E2E_ADMIN_PASSWORD;
const runId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();
const directCode = `E2E-CACHE-DB-${runId}`;
const apiCode = `E2E-CACHE-API-${runId}`;

async function loginAdmin(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueTestClientIp() });
  await page.request.post("/api/auth/logout");
  await page.goto("/giris");
  await page.getByRole("textbox", { name: "E-posta" }).fill(adminEmail!);
  await page.getByLabel("Şifre").fill(adminPassword!);
  await page.getByRole("button", { name: /^Giriş Yap$/ }).click();
  await page.waitForURL(/\/panel\//);
}

async function versionCountLabel(page: Page) {
  await page.goto("/panel/yonetim/kazanimlar");
  await expect(page.getByRole("main")).toBeVisible();
  return page.getByRole("main").getByText(/^\d+ sürüm$/).first().innerText();
}

test.describe("müfredat kataloğu önbelleği", () => {
  test.skip(!adminEmail || !adminPassword, "Panel E2E admin hesabı tanımlı değil.");

  test.afterAll(async () => {
    await prisma.curriculumVersion.deleteMany({ where: { code: { in: [directCode, apiCode] } } });
    await prisma.$disconnect();
  });

  test("route dışı yazım önbellekte kalır, API yazımı önbelleği geçersiz kılar", async ({ page }) => {
    await loginAdmin(page);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: adminEmail! }, select: { id: true } });

    const before = await versionCountLabel(page);
    const initialCount = Number.parseInt(before, 10);

    await prisma.curriculumVersion.create({
      data: { code: directCode, title: "E2E önbellek DB yazımı", exam: "LGS", academicYear: 2026, createdById: admin.id },
    });
    expect(await versionCountLabel(page)).toBe(`${initialCount} sürüm`);
    await expect(page.getByText(directCode)).toHaveCount(0);

    const created = await page.evaluate(async (code) => {
      const response = await fetch("/api/panel/curriculum/versions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code, title: "E2E önbellek API yazımı", exam: "LGS", academicYear: 2026 }),
      });
      return { status: response.status, body: await response.json() };
    }, apiCode);
    expect(created.status, JSON.stringify(created.body)).toBe(200);

    expect(await versionCountLabel(page)).toBe(`${initialCount + 2} sürüm`);
    await expect(page.getByText(directCode).first()).toBeVisible();
    await expect(page.getByText(apiCode).first()).toBeVisible();
  });
});
