import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { getPackagePriceCents } from "../../lib/content";
import { loginAs } from "./helpers/panel-login";

const db = new PrismaClient();
let orderId: string;
test.describe.serial("ödeme sonrası başlangıç deneyimi", () => {
  test.beforeAll(async () => {
    const amount = getPackagePriceCents("LGS", "Matematik Ders Paketi");
    const order = await db.odOrder.create({ data: {
      userId: "e2e-user-student", packageName: "LGS Matematik Ders Paketi", category: "LGS", subject: "Matematik Ders Paketi",
      status: "PAID", subtotalCents: amount, totalCents: amount,
      buyerInfo: { notes: "PRIVATE_ONBOARDING_NOTE", email: "private-onboarding@example.com", placementPreferences: { timeRanges: ["WEEKDAY_EVENING", "WEEKEND_MORNING", "PRIVATE_INVALID_RANGE"] } },
      payments: { create: { provider: "PAYTR", status: "SUCCEEDED", amountCents: amount, paidAt: new Date() } },
      onboarding: { create: { state: "PARENT_LINKED", ownerId: "e2e-user-admin" } },
    } });
    orderId = order.id;
  });
  test.afterAll(async () => { if (orderId) await db.odOrder.delete({ where: { id: orderId } }); await db.$disconnect(); });

  test("doğrulanmış ödeme üç adımı ve yalnız kontrollü saat tercihini gösterir", async ({ page }) => {
    await page.goto(`/paketler/satin-al/sonuc?orderId=${orderId}&status=success`);
    const main = page.locator("main");
    await expect(main).toContainText("24 saat içinde iletişim");
    await expect(main).toContainText("48 saat içinde grup sonucu");
    await expect(main).toContainText("Ardından ilk ders");
    await expect(main).toContainText("Hafta içi 17.00–21.00");
    await expect(main).toContainText("Hafta sonu 09.00–13.00");
    await expect(main).not.toContainText("PRIVATE_");
    await expect(main).not.toContainText("private-onboarding@example.com");
  });

  test("sipariş doğrulanmadan URL'deki başarı işareti başlangıç takvimi açmaz", async ({ page }) => {
    await page.goto("/paketler/satin-al/sonuc?status=success");
    await expect(page.getByRole("heading", { name: "Sipariş doğrulanamadı" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sıradaki adımlar" })).toHaveCount(0);
  });

  for (const role of ["student", "parent"] as const) {
    test(`${role} paneli başlangıç, sonraki adım ve zamanı gösterir`, async ({ page }) => {
      await loginAs(page, { email: process.env[role === "student" ? "PANEL_E2E_STUDENT_EMAIL" : "PANEL_E2E_PARENT_EMAIL"]!, password: process.env[role === "student" ? "PANEL_E2E_STUDENT_PASSWORD" : "PANEL_E2E_PARENT_PASSWORD"]!, failureLabel: role });
      await page.goto(role === "student" ? "/panel/ogrenci" : "/panel/veli?studentId=e2e-student-profile");
      const card = page.getByRole("region", { name: "Başlangıç" });
      await expect(card).toContainText("Öğrenci ve veli paneli hazır");
      await expect(card).toContainText("Tahmini bilgilendirme");
      await expect(card).toContainText("Hafta içi 17.00–21.00");
      await expect(card).not.toContainText(/PARENT_LINKED|SLA|PRIVATE_/);
    });
  }

  test("veli bağlı olmayan öğrencinin başlangıcına URL ile erişemez", async ({ page }) => {
    await loginAs(page, { email: process.env.PANEL_E2E_PARENT_EMAIL!, password: process.env.PANEL_E2E_PARENT_PASSWORD!, failureLabel: "parent" });
    await page.goto("/panel/veli?studentId=e2e-student-profile-foreign");
    // notFound(), streaming yanıtı başladıysa 200 durumuyla 404 ekranı gösterebilir.
    await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Başlangıç" })).toHaveCount(0);
  });

  test("ürün veya profil bekleyen hesap boş ekran yerine başlangıcı gösterir", async ({ page }) => {
    const seed = await db.user.findUniqueOrThrow({ where: { id: "e2e-user-student" } });
    const student = await db.user.create({ data: { email: `od-empty-${crypto.randomUUID()}@example.com`, role: "STUDENT", passwordHash: seed.passwordHash, mustChangePassword: false, inviteAcceptedAt: new Date() } });
    try {
      await loginAs(page, { email: student.email, password: process.env.PANEL_E2E_STUDENT_PASSWORD!, failureLabel: "new-student" });
      await page.goto("/panel/ogrenci");
      await expect(page.getByRole("region", { name: "Başlangıç" })).toContainText("Hesabınız hazır");
      await db.productMembership.create({ data: { userId: student.id, product: "OD" } });
      await page.reload();
      await expect(page.getByRole("region", { name: "Başlangıç" })).toContainText("Başlangıç zamanını ekibimiz sizinle paylaşacak.");
      await expect(page.getByText("Profiliniz hazırlanıyor.", { exact: true })).toHaveCount(0);
    } finally { await db.user.delete({ where: { id: student.id } }); }
    const parent = await db.user.create({ data: { email: `od-empty-parent-${crypto.randomUUID()}@example.com`, role: "PARENT", passwordHash: seed.passwordHash, mustChangePassword: false, inviteAcceptedAt: new Date() } });
    try {
      await loginAs(page, { email: parent.email, password: process.env.PANEL_E2E_STUDENT_PASSWORD!, failureLabel: "new-parent" });
      await page.goto("/panel/veli");
      await expect(page.getByRole("region", { name: "Başlangıç" })).toContainText("Hesabınız hazır");
    } finally { await db.user.delete({ where: { id: parent.id } }); }
  });
});
