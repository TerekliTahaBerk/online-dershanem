/**
 * Phase 3 / Session 11 — D7: Enrollment & payment invariants.
 *
 * UI yerine doğrudan Prisma'dan invariant doğrulaması (deterministik).
 *   - Seed'de oluşturulan PaymentScheduleItem PENDING olmalı, paidAmount=0.
 *   - Enrollment status değişimi PaymentScheduleItem.amount'u mutate etmemeli.
 *   - Aynı paket için duplike active enrollment yaratılmamalı.
 *   - Seed sonrası AccountingEntry yaratılmadı (income at-enrollment yok).
 */
import { test, expect } from "@playwright/test";
import { testPrisma, getSeedIds, E2E_FIXTURES } from "./helpers/db";

test.describe("D7 — Enrollment & payment invariants @smoke", () => {
  test("PaymentScheduleItem PENDING + paidAmount=0", async () => {
    const seed = await getSeedIds();
    const psi = await testPrisma.paymentScheduleItem.findFirstOrThrow({
      where: {
        studentId: seed.studentId,
        parentId: seed.parentId,
        packageId: seed.packageId,
        title: E2E_FIXTURES.paymentTitle,
      },
    });
    expect(psi.status).toBe("PENDING");
    expect(psi.paidAmount).toBe(0);
    expect(psi.amount).toBeGreaterThan(0);
    expect(psi.accountingEntryId).toBeNull();
  });

  test("enrollment ACTIVE + listPrice paket fiyatına eşit", async () => {
    const seed = await getSeedIds();
    const enrollments = await testPrisma.studentPackageEnrollment.findMany({
      where: { studentId: seed.studentId, packageId: seed.packageId, status: "ACTIVE" },
    });
    expect(enrollments.length).toBe(1);
    const pkg = await testPrisma.package.findUniqueOrThrow({ where: { id: seed.packageId } });
    expect(enrollments[0].listPrice).toBe(pkg.price);
  });

  test("enrollment status flip PaymentScheduleItem.amount'u değiştirmez", async () => {
    const seed = await getSeedIds();
    const enrollment = await testPrisma.studentPackageEnrollment.findFirstOrThrow({
      where: { studentId: seed.studentId, packageId: seed.packageId, status: "ACTIVE" },
    });
    const psiBefore = await testPrisma.paymentScheduleItem.findFirstOrThrow({
      where: { studentId: seed.studentId, packageId: seed.packageId, title: E2E_FIXTURES.paymentTitle },
    });

    try {
      // PAUSED ve geri ACTIVE — amount aynı kalmalı
      await testPrisma.studentPackageEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "PAUSED" },
      });
      const psiAfterPause = await testPrisma.paymentScheduleItem.findUniqueOrThrow({
        where: { id: psiBefore.id },
      });
      expect(psiAfterPause.amount).toBe(psiBefore.amount);
      expect(psiAfterPause.status).toBe(psiBefore.status);
    } finally {
      await testPrisma.studentPackageEnrollment.update({
        where: { id: enrollment.id },
        data: { status: "ACTIVE" },
      });
    }
  });

  test("seed sonrası AccountingEntry oluşmadı (income at-enrollment yok)", async () => {
    const seed = await getSeedIds();
    const entries = await testPrisma.accountingEntry.findMany({
      where: { packageId: seed.packageId, studentId: seed.studentId },
    });
    expect(entries.length).toBe(0);
  });
});
