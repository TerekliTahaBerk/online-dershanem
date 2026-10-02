import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAs } from "./helpers/panel-login";
const db = new PrismaClient();
let groupId: string;
let lessonIds: string[] = [];
const meetingUrl = `https://example.com/lesson-day-${crypto.randomUUID()}`;
test.describe.serial("ders günü", () => {
  test.beforeAll(async () => {
    const group = await db.group.create({ data: { name: "E2E Ders Günü", subject: "Matematik", teacherId: "e2e-user-teacher", enrollments: { create: { studentId: "e2e-student-profile" } } } });
    groupId = group.id;
    const now = Date.now();
    for (const [hours, status] of [[23.9, "PLANNED"], [0.9, "PLANNED"], [0.9, "CANCELLED"]] as const) {
      const lesson = await db.lesson.create({ data: { groupId, teacherId: "e2e-user-teacher", title: `Ders günü ${hours} ${status}`, startsAt: new Date(now + hours * 3_600_000), endsAt: new Date(now + (hours + 1) * 3_600_000), status, meetingUrl } });
      lessonIds.push(lesson.id);
    }
    for (const userId of ["e2e-user-student", "e2e-user-parent"]) await db.notificationPreference.upsert({ where: { userId }, create: { userId }, update: { inAppEnabled: true, lessonSummary: true } });
  });
  test.afterAll(async () => {
    await db.notification.deleteMany({ where: { id: { contains: `:LESSON:` }, OR: lessonIds.map((id) => ({ id: { contains: `:${id}:` } })) } });
    if (groupId) await db.group.delete({ where: { id: groupId } });
    await db.$disconnect();
  });
  test("cron yalnız planlı derse iki zaman penceresinde tekil öğrenci/veli hatırlatması üretir", async ({ request }) => {
    expect((await request.get("/api/cron/lesson-reminders")).status()).toBe(401);
    const headers = { authorization: `Bearer ${process.env.CRON_SECRET}` };
    expect((await request.get("/api/cron/lesson-reminders", { headers })).status()).toBe(200);
    expect((await request.get("/api/cron/lesson-reminders", { headers })).status()).toBe(200);
    for (const userId of ["e2e-user-student", "e2e-user-parent"]) {
      expect(await db.notification.count({ where: { id: `${userId}:LESSON:${lessonIds[0]}:T24` } })).toBe(1);
      expect(await db.notification.count({ where: { id: `${userId}:LESSON:${lessonIds[1]}:T1` } })).toBe(1);
      expect(await db.notification.count({ where: { id: { startsWith: `${userId}:LESSON:${lessonIds[2]}:` } } })).toBe(0);
    }
    const heartbeat = await db.cronHeartbeat.findUnique({ where: { name: "lesson-reminders" } });
    expect(heartbeat?.lastSucceededAt).toBeTruthy();
  });
  for (const role of ["student", "parent"] as const) {
    test(`${role} takvim butonu aktif üyelikte link içerir; yabancı öğrenci 404`, async ({ page }) => {
      await loginAs(page, { email: process.env[role === "student" ? "PANEL_E2E_STUDENT_EMAIL" : "PANEL_E2E_PARENT_EMAIL"]!, password: process.env[role === "student" ? "PANEL_E2E_STUDENT_PASSWORD" : "PANEL_E2E_PARENT_PASSWORD"]!, failureLabel: role });
      await page.goto(role === "student" ? "/panel/ogrenci/takvim" : "/panel/veli/takvim?studentId=e2e-student-profile");
      const link = page.getByRole("link", { name: "Takvime ekle (.ics)" });
      await expect(link).toBeVisible();
      const response = await page.request.get((await link.getAttribute("href"))!);
      expect(response.status()).toBe(200);
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect((await response.text()).replace(/\r\n /g, "")).toContain(`URL:${meetingUrl}`);
      expect((await page.request.get("/api/panel/calendar/export?studentId=e2e-student-profile-foreign")).status()).toBe(404);
      await db.enrollment.update({ where: { groupId_studentId: { groupId, studentId: "e2e-student-profile" } }, data: { endedAt: new Date() } });
      expect((await (await page.request.get("/api/panel/calendar/export")).text()).replace(/\r\n /g, "")).not.toContain(meetingUrl);
      await db.enrollment.update({ where: { groupId_studentId: { groupId, studentId: "e2e-student-profile" } }, data: { endedAt: null } });
    });
  }
  test("veli ilişkisi bittiğinde takvim ihracı 404 olur", async ({ page }) => {
    await loginAs(page, { email: process.env.PANEL_E2E_PARENT_EMAIL!, password: process.env.PANEL_E2E_PARENT_PASSWORD!, failureLabel: "parent" });
    const where = { parentId_studentId: { parentId: "e2e-user-parent", studentId: "e2e-student-profile" } };
    try {
      for (const data of [{ active: false }, { active: true, endedAt: new Date() }, { endedAt: null, canViewAcademic: false }]) {
        await db.parentStudent.update({ where, data });
        expect((await page.request.get("/api/panel/calendar/export?studentId=e2e-student-profile")).status()).toBe(404);
      }
    } finally { await db.parentStudent.update({ where, data: { active: true, endedAt: null, canViewAcademic: true } }); }
  });
});
