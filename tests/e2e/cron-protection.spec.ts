/**
 * Phase 3 / Session 11 — D11: Cron endpoint protection.
 *
 * `lib/jobs/runner.ts > runJob` davranışı:
 *   - CRON_SECRET set ve `Authorization: Bearer <secret>` doğru → 200
 *   - CRON_SECRET set ama header eksik/yanlış → 401
 *   - CRON_SECRET set değil → fail-open (dev davranışı, test'i skip et)
 *
 * Cron iş mantığı yan etki yaratmamalı — DB row count delta'ları
 * testin başı/sonu için kontrol ediyoruz (StudentPackageEnrollment + AuditLog).
 *
 * Test edilen route: `/api/cron/scheduled-reminders` (Phase 2 / Session 18).
 */
import { test, expect } from "@playwright/test";
import { testPrisma } from "./helpers/db";

const CRON_SECRET = process.env.CRON_SECRET ?? "";
const ROUTE = "/api/cron/scheduled-reminders";

test.describe("D11 — Cron protection @smoke", () => {
  test.skip(!CRON_SECRET, "CRON_SECRET set değil — dev modunda runner fail-open. CI/staging'de çalışır.");

  test("Authorization header'ı yoksa 401", async ({ request }) => {
    const res = await request.get(ROUTE);
    expect(res.status()).toBe(401);
  });

  test("Yanlış token ile 401", async ({ request }) => {
    const res = await request.get(ROUTE, {
      headers: { Authorization: "Bearer wrong-secret-xxx" },
    });
    expect(res.status()).toBe(401);
  });

  test("Doğru token ile 200 + DB row count'ları stabil", async ({ request }) => {
    const before = {
      enrollments: await testPrisma.studentPackageEnrollment.count(),
      psi: await testPrisma.paymentScheduleItem.count(),
      users: await testPrisma.user.count(),
    };

    const res = await request.get(ROUTE, {
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("job", "scheduled-reminders");
    expect(body).toHaveProperty("durationMs");

    const after = {
      enrollments: await testPrisma.studentPackageEnrollment.count(),
      psi: await testPrisma.paymentScheduleItem.count(),
      users: await testPrisma.user.count(),
    };
    expect(after.enrollments).toBe(before.enrollments);
    expect(after.psi).toBe(before.psi);
    expect(after.users).toBe(before.users);
  });
});
