import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { loginAs } from "./helpers/panel-login";
import { hasE2EEnv } from "./env-requirements";

/**
 * PHASE 0 — panel güvenlik değişmezleri, GERÇEK API yanıtı üzerinden.
 *
 * P0-1 zaman çizelgesi görünürlüğü · P0-2 yönetim ürün erişimi satın alma
 * verisini bozmaz · P0-3 OD grup öğretmeni Yön koçu değildir · P0-4
 * `canViewAcademic`. (P0-5 sipariş provizyonu entegrasyon testinde, gerçek
 * PayTR callback'iyle doğrulanır: tests/integration/phase0-security.integration.ts.)
 *
 * Gizleme güvenlik sınırı değildir: her kontrol doğrudan uç çağrısıdır.
 */

const db = new PrismaClient();
const origin = { origin: "http://localhost:3000" };
const STUDENT = "e2e-student-profile";
/** Öğretmenin OD grubunda kayıtlı ama koçu OLMADIĞI öğrenci. */
const GROUP_ONLY_STUDENT = "e2e-student-profile-foreign";
const COACH_ASSIGNMENT = "e2e-coach-assignment";
const PARENT_LINK = { parentId_studentId: { parentId: "e2e-user-parent", studentId: STUDENT } };

const account = (role: "ADMIN" | "TEACHER" | "STUDENT" | "PARENT") => ({
  email: process.env[`PANEL_E2E_${role}_EMAIL`]!,
  password: process.env[`PANEL_E2E_${role}_PASSWORD`]!,
  failureLabel: role,
});

async function timelineIds(page: Page) {
  const response = await page.request.get(`/api/panel/student-success/progress/${STUDENT}?view=timeline`);
  expect(response.status(), await response.text()).toBe(200);
  const body = (await response.json()) as { timeline: Array<{ id: string }> };
  return new Set(body.timeline.map((entry) => entry.id));
}

test.describe.serial("Phase 0 güvenlik değişmezleri", () => {
  test.skip(!hasE2EEnv("adminAccount", "teacherAccount", "studentAccount", "parentAccount"), "E2E hesapları tanımlı değil");
  test.afterAll(async () => {
    await db.parentStudent.update({ where: PARENT_LINK, data: { active: true, endedAt: null, canViewAcademic: true } });
    await db.coachAssignment.update({ where: { id: COACH_ASSIGNMENT }, data: { endedAt: null } });
    await db.$disconnect();
  });

  test("P0-1 zaman çizelgesi STAFF/INTERNAL olayları öğrenci ve veliye döndürmez", async ({ page }) => {
    const run = crypto.randomUUID();
    const events = Object.fromEntries(
      await Promise.all(
        (["INTERNAL", "STAFF", "STUDENT", "PARENT"] as const).map(async (visibility) => {
          const row = await db.studentTimelineEvent.create({
            data: { studentId: STUDENT, kind: "OTHER", title: `phase0-${visibility}-${run}`, visibility, occurredAt: new Date() },
          });
          return [visibility, row.id] as const;
        }),
      ),
    ) as Record<"INTERNAL" | "STAFF" | "STUDENT" | "PARENT", string>;
    try {
      await loginAs(page, account("STUDENT"));
      const student = await timelineIds(page);
      expect(student.has(events.INTERNAL) || student.has(events.STAFF), "öğrenci personel olayı görmemeli").toBe(false);
      expect(student.has(events.STUDENT) && student.has(events.PARENT)).toBe(true);

      await loginAs(page, account("PARENT"));
      const parent = await timelineIds(page);
      expect([events.INTERNAL, events.STAFF, events.STUDENT].some((id) => parent.has(id)), "veli yalnız PARENT görür").toBe(false);
      expect(parent.has(events.PARENT)).toBe(true);

      await loginAs(page, account("TEACHER"));
      const teacher = await timelineIds(page);
      expect(teacher.has(events.INTERNAL)).toBe(false);
      expect(teacher.has(events.STAFF) && teacher.has(events.STUDENT) && teacher.has(events.PARENT)).toBe(true);

      await loginAs(page, account("ADMIN"));
      const admin = await timelineIds(page);
      for (const id of Object.values(events)) expect(admin.has(id)).toBe(true);
    } finally {
      await db.studentTimelineEvent.deleteMany({ where: { id: { in: Object.values(events) } } });
    }
  });

  test("P0-3 Yön yazmaları yalnız atanmış koça ve yöneticiye açık", async ({ page }) => {
    const note = (studentId: string) =>
      page.request.post("/api/panel/kocum/notes", { data: { studentId, body: "Phase 0 koç notu", visibility: "INTERNAL" }, headers: origin });

    await loginAs(page, account("TEACHER"));
    // Negatif: öğretmen bu öğrencinin OD grup öğretmeni ama koçu değil.
    expect((await note(GROUP_ONLY_STUDENT)).status(), "OD grup öğretmeni Yön notu yazamaz").toBe(403);
    // Pozitif: aktif koç ataması.
    const coachNote = await note(STUDENT);
    expect(coachNote.status(), await coachNote.text()).toBe(200);

    // Negatif: OD grup öğretmeni Yön planını onaylayamaz.
    const okProduct = await db.product.findUniqueOrThrow({ where: { code: "OK" }, select: { id: true } });
    const plan = await db.weeklyPlan.create({
      data: {
        studentId: GROUP_ONLY_STUDENT, productRefId: okProduct.id, weekStart: new Date("2099-01-04T21:00:00.000Z"), status: "DRAFT", capacityMinutes: 120, createdById: "e2e-user-admin",
      },
    });
    await db.weeklyPlanTask.create({
      data: { planId: plan.id, scheduledFor: new Date("2099-01-05T09:00:00.000Z"), position: 0, title: "Phase 0", durationMinutes: 30, sourceType: "MANUAL_COACH", reasonCode: "CAPACITY_BALANCE" },
    });
    try {
      const approve = await page.request.post(`/api/panel/adaptive-plan/${plan.id}/approve`, { data: { expectedVersion: plan.version }, headers: origin });
      expect(approve.status(), "koç olmayan öğretmen planı onaylayamaz").toBe(404);
      expect((await db.weeklyPlan.findUniqueOrThrow({ where: { id: plan.id } })).status).toBe("DRAFT");
    } finally {
      await db.weeklyPlan.delete({ where: { id: plan.id } });
    }

    // Sonlanmış koç ataması yetki vermez.
    await db.coachAssignment.update({ where: { id: COACH_ASSIGNMENT }, data: { endedAt: new Date() } });
    try {
      expect((await note(STUDENT)).status(), "sonlanmış atama").toBe(403);
    } finally {
      await db.coachAssignment.update({ where: { id: COACH_ASSIGNMENT }, data: { endedAt: null } });
    }

    // Yönetici koç olmadan da yazabilir (mevcut kural).
    await loginAs(page, account("ADMIN"));
    expect((await note(GROUP_ONLY_STUDENT)).status()).toBe(200);
    await db.coachNote.deleteMany({ where: { body: "Phase 0 koç notu" } });
  });

  test("P0-4 canViewAcademic=false veliyi akademik veriden çıkarır; hesap ekranı çalışır", async ({ page }) => {
    await loginAs(page, account("PARENT"));
    const progress = () => page.request.get(`/api/panel/student-success/progress/${STUDENT}`);
    // Case A
    expect((await progress()).status()).toBe(200);
    try {
      // Case B — akademik izin yok
      await db.parentStudent.update({ where: PARENT_LINK, data: { canViewAcademic: false, canViewPayments: true } });
      expect((await progress()).status(), "akademik API").toBe(404);
      expect((await page.request.get(`/api/panel/student-success/progress/${STUDENT}?view=timeline`)).status()).toBe(404);
      // App Router, streaming başladıktan sonra notFound() çalışırsa HTTP 200 kalabilir;
      // güvenlik sonucu veri yerine 404 yüzeyidir (bkz. panel-access.spec.ts).
      for (const route of ["odevler", "takvim", "kocluk"]) {
        await page.goto(`/panel/veli/${route}?studentId=${STUDENT}`);
        await expect(page.getByRole("heading", { name: "Sayfa bulunamadı" }), `akademik sayfa: ${route}`).toBeVisible();
      }
      // Case C — ödeme/hesap ekranı çalışmaya devam eder
      const accountPage = await page.goto("/panel/veli/hesap");
      expect(accountPage?.status()).toBe(200);
      await expect(page.getByRole("heading", { name: "Hesap ve paket" })).toBeVisible();
      // Case D — bağlantı sonlanmış
      await db.parentStudent.update({ where: PARENT_LINK, data: { canViewAcademic: true, active: false, endedAt: new Date() } });
      expect((await progress()).status(), "sonlanmış bağlantı").toBe(404);
    } finally {
      await db.parentStudent.update({ where: PARENT_LINK, data: { active: true, endedAt: null, canViewAcademic: true, canViewPayments: false } });
    }
  });

  test("P0-2 yönetim ürün formu PURCHASE üyeliğini bozmaz", async ({ page }) => {
    const run = crypto.randomUUID().slice(0, 8);
    const seed = await db.user.findUniqueOrThrow({ where: { id: "e2e-user-student" }, select: { passwordHash: true } });
    const student = await db.user.create({ data: { email: `phase0-p02-${run}@example.com`, role: "STUDENT", passwordHash: seed.passwordHash, mustChangePassword: false, inviteAcceptedAt: new Date(), studentProfile: { create: {} } } });
    const order = await db.odOrder.create({ data: { packageName: "phase0", category: "TEST", subject: "TEST", subtotalCents: 1000, totalCents: 1000, buyerInfo: {} } });
    const startsAt = new Date("2026-09-01T00:00:00.000Z");
    const expiresAt = new Date("2099-06-30T00:00:00.000Z");
    const purchase = await db.productMembership.create({ data: { userId: student.id, product: "OD", source: "PURCHASE", startsAt, expiresAt, sourceOdOrderId: order.id } });
    try {
      await loginAs(page, account("ADMIN"));
      // Ürün erişimi değişikliği taze step-up ister; testte oturuma doğrudan yazılır.
      await db.session.updateMany({ where: { user: { email: process.env.PANEL_E2E_ADMIN_EMAIL! }, revokedAt: null }, data: { stepUpAt: new Date() } });
      const put = (products: string[]) => page.request.put(`/api/panel/users/${student.id}/products`, { data: { products }, headers: origin });

      const keep = await put(["OD"]);
      expect(keep.status(), await keep.text()).toBe(200);
      const kept = await db.productMembership.findUniqueOrThrow({ where: { id: purchase.id } });
      expect([kept.source, kept.startsAt.toISOString(), kept.expiresAt?.toISOString(), kept.sourceOdOrderId, kept.revokedAt])
        .toEqual(["PURCHASE", startsAt.toISOString(), expiresAt.toISOString(), order.id, null]);

      expect((await put(["OD", "OK"])).status()).toBe(200);
      const rows = await db.productMembership.findMany({ where: { userId: student.id }, orderBy: { product: "asc" } });
      expect(rows.map((row) => [row.product, row.source])).toEqual([["OD", "PURCHASE"], ["OK", "MANUAL"]]);

      expect((await put(["OK"])).status()).toBe(200);
      const revoked = await db.productMembership.findUniqueOrThrow({ where: { id: purchase.id } });
      expect(revoked.revokedAt).not.toBeNull();
      expect([revoked.source, revoked.sourceOdOrderId, revoked.expiresAt?.toISOString()]).toEqual(["PURCHASE", order.id, expiresAt.toISOString()]);
      expect(await db.productMembership.count({ where: { userId: student.id } })).toBe(2);
      expect(await db.auditLog.count({ where: { entityId: student.id, action: "panel.user_products_updated" } })).toBe(3);
    } finally {
      await db.productMembership.deleteMany({ where: { userId: student.id } });
      await db.auditLog.deleteMany({ where: { entityId: student.id } });
      await db.studentProfile.deleteMany({ where: { userId: student.id } });
      await db.user.delete({ where: { id: student.id } });
      await db.odOrder.delete({ where: { id: order.id } });
    }
  });
});
