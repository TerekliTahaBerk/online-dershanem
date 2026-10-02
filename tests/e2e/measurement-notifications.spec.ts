import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAs } from "./helpers/panel-login";
import { istanbulDayStart, istanbulWeekStart } from "@/lib/istanbul-time";
const db = new PrismaClient();
const run = crypto.randomUUID();
let userId: string, foreignUserId: string, planId: string, foreignPlanId: string, taskId: string, foreignTaskId: string;
const email = `home-complete-${run}@example.com`;
const origin = { origin: "http://localhost:3000" };
test.describe.serial("Ölçüm ve bildirim tercihleri", () => {
  test.beforeAll(async () => {
    const seed = await db.user.findUniqueOrThrow({ where: { id: "e2e-user-student" } });
    const product = await db.product.findUniqueOrThrow({ where: { code: "OK" } });
    for (const foreign of [false, true]) {
      const user = await db.user.create({ data: { email: foreign ? `foreign-${email}` : email, role: "STUDENT", fullName: "Ölçüm Öğrencisi", passwordHash: seed.passwordHash, mustChangePassword: false, inviteAcceptedAt: new Date(), studentProfile: { create: {} }, productMemberships: { create: { product: "OK" } } }, include: { studentProfile: true } });
      if (foreign) foreignUserId = user.id; else userId = user.id;
      const plan = await db.weeklyPlan.create({ data: { studentId: user.studentProfile!.id, productRefId: product.id, weekStart: istanbulWeekStart(new Date()), status: "APPROVED", approvedAt: new Date(), capacityMinutes: 20, createdById: "e2e-user-teacher", tasks: { create: { title: `Ana sayfa çalışması ${run}`, durationMinutes: 20, scheduledFor: istanbulDayStart(new Date()), sourceType: "MANUAL_COACH", reasonCode: "CAPACITY_BALANCE", position: 1 } } }, include: { tasks: true } });
      if (foreign) { foreignUserId = user.id; foreignPlanId = plan.id; foreignTaskId = plan.tasks[0].id; } else { userId = user.id; planId = plan.id; taskId = plan.tasks[0].id; }
    }
  });
  test.afterAll(async () => { await db.weeklyPlan.deleteMany({ where: { id: { in: [planId, foreignPlanId].filter(Boolean) } } }); await db.user.deleteMany({ where: { id: { in: [userId, foreignUserId].filter(Boolean) } } }); await db.$disconnect(); });
  test("ana sayfada gerçek tamamlama tek kimliksiz event üretir; yabancı görev reddedilir", async ({ page }) => {
    const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
    await loginAs(page, { email, password: process.env.PANEL_E2E_STUDENT_PASSWORD!, failureLabel: "home-complete" });
    expect((await page.request.post(`/api/panel/adaptive-plan/tasks/${foreignTaskId}/complete`, { data: { entryPoint: "HOME" }, headers: origin })).status()).toBe(404);
    const before = await db.productEvent.count({ where: { name: "student_next_action_completed", properties: { path: ["entryPoint"], equals: "HOME" } } });
    await page.goto("/panel/ogrenci");
    const response = page.waitForResponse((result) => result.url().endsWith(`/tasks/${taskId}/complete`));
    await page.getByRole("button", { name: "Bu çalışmayı tamamladım" }).click(); expect((await response).status()).toBe(200);
    await expect.poll(() => db.productEvent.count({ where: { name: "student_next_action_completed", properties: { path: ["entryPoint"], equals: "HOME" } } })).toBe(before + 1);
    expect((await db.weeklyPlanTask.findUniqueOrThrow({ where: { id: taskId } })).status).toBe("DONE");
    expect((await page.request.post(`/api/panel/adaptive-plan/tasks/${taskId}/complete`, { data: { entryPoint: "HOME" }, headers: origin })).status()).toBe(404);
    expect(await db.productEvent.count({ where: { name: "student_next_action_completed", properties: { path: ["entryPoint"], equals: "HOME" } } })).toBe(before + 1);
    const event = await db.productEvent.findFirstOrThrow({ where: { name: "student_next_action_completed", properties: { path: ["entryPoint"], equals: "HOME" } }, orderBy: { occurredAt: "desc" } });
    expect(Object.keys(event.properties as object).sort()).toEqual(["actionKind", "ageBand", "entryPoint", "evidenceBand", "product", "reasonCode", "role"].sort()); expect(JSON.stringify(event.properties)).not.toContain(userId); expect(JSON.stringify(event.properties)).not.toContain(taskId);
    expect(errors).toEqual([]);
  });
  test("sessiz saat ve günlük özet kaydedilir; bekleyen bildirim menü/API ve okundu işlemiyle açılmaz", async ({ page }) => {
    await loginAs(page, { email, password: process.env.PANEL_E2E_STUDENT_PASSWORD!, failureLabel: "notification-prefs" });
    await page.goto("/panel/bildirimler");
    await page.getByLabel("Başlangıç saati", { exact: true }).fill("22:00"); await page.getByLabel("Bitiş saati", { exact: true }).fill("08:00");
    await page.getByLabel("Günde tek özet al").check(); await page.getByLabel("Günlük özet saati").fill("18:00");
    const saved = page.waitForResponse((response) => response.url().endsWith("/notifications/preferences")); await page.getByRole("button", { name: "Kaydet", exact: true }).click(); const savedResponse = await saved; expect(savedResponse.status(), `${savedResponse.request().postData()} ${await savedResponse.text()}`).toBe(200); await expect(page.getByText("Tercihler kaydedildi.")).toBeVisible();
    const preference = await db.notificationPreference.findUniqueOrThrow({ where: { userId } }); expect(preference.quietStartMinute).toBe(1320); expect(preference.quietEndMinute).toBe(480); expect(preference.dailyDigestMinute).toBe(1080); expect(preference.dailyDigest).toBe(true);
    expect((await page.request.patch("/api/panel/notifications/preferences", { headers: origin, data: { inAppEnabled: true, emailEnabled: false, whatsappEnabled: false, lessonSummary: true, weeklyDigest: true, absence: true, assignment: true, payment: true, quietStartMinute: 1320 } })).status()).toBe(400);
    await page.reload(); await page.getByLabel("Bitiş saati", { exact: true }).fill("09:00");
    const resaved = page.waitForResponse((response) => response.url().endsWith("/notifications/preferences")); await page.getByRole("button", { name: "Kaydet", exact: true }).click(); expect((await resaved).status()).toBe(200);
    expect((await db.notificationPreference.findUniqueOrThrow({ where: { userId } })).quietEndMinute).toBe(540);
    const pending = await db.notification.create({ data: { userId, type: "SYSTEM", title: `Sessiz bekleyen ${run}`, body: "Bekleyen hatırlatma", inAppVisible: false, deliveryPending: true, availableAt: new Date(Date.now() + 86_400_000) } });
    const response = await page.request.get("/api/panel/notifications"); expect(response.status()).toBe(200); expect(await response.text()).not.toContain(pending.id);
    await page.request.post("/api/panel/notifications/read", { headers: origin, data: { id: pending.id } }); expect((await db.notification.findUniqueOrThrow({ where: { id: pending.id } })).readAt).toBeNull();
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/panel/bildirimler"); await page.screenshot({ path: "/tmp/od-ok-phase5-mobile-notifications.png", fullPage: true });
  });
  test("yönetim ilk ders göstergelerinde küçük örneği gizler", async ({ page }) => {
    await loginAs(page, { email: process.env.PANEL_E2E_ADMIN_EMAIL!, password: process.env.PANEL_E2E_ADMIN_PASSWORD!, failureLabel: "metrics-admin" });
    await page.goto("/panel/yonetim/isler");
    const metrics = page.getByRole("region", { name: "İlk ders göstergeleri" }); await expect(metrics.getByText("Ödemeden ilk derse geçen süre", { exact: true })).toBeVisible(); await expect(metrics.getByText("İlk derse katılım", { exact: true })).toBeVisible(); await expect(metrics.getByText("Yetersiz veri", { exact: true })).toHaveCount(2);
    await page.setViewportSize({ width: 1440, height: 900 }); await page.screenshot({ path: "/tmp/od-ok-phase5-desktop-metrics.png", fullPage: true });
  });
});
