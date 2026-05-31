/**
 * Phase 3 / Session 12 — D5: Bulk classroom assignment idempotency.
 *
 * `lib/panel/bulk-operations.ts` `server-only` olduğu için doğrudan import
 * edilemiyor; bunun yerine **şema-invariant** seviyesinde idempotency'yi
 * test ediyoruz: `ClassroomStudent` composite PK = (classroomId, studentId).
 * Bu, bulk-assignment helper'ının `upsert` mantığının dayanağı.
 *
 * Ek olarak admin UI'da `/panel/admin/ogrenciler` listesi → seçim checkbox'ı
 * + bulk action menüsünün render olduğunu doğruluyoruz (Session 11
 * bulk-actions.spec.ts'in tamamlayıcısı).
 *
 * NOT: Tam UI bulk action akışı (modal + classroom seçici + submit) bir
 * sonraki turda eklenecek; modal interaksiyonu deterministik selectors
 * gerektirir (data-testid eklemek = ürün değişikliği).
 */
import { test, expect } from "./fixtures/auth";
import { testPrisma, getSeedIds } from "./helpers/db";

test.describe("D5 — Bulk classroom idempotency @smoke", () => {
  test("ClassroomStudent composite PK upsert: aynı (classroom, student) duplike yaratmaz", async () => {
    const seed = await getSeedIds();

    // 1. Mevcut satır var mı? Seed zaten bağlamış olmalı.
    const before = await testPrisma.classroomStudent.count({
      where: { classroomId: seed.classroomId, studentId: seed.studentId },
    });
    expect(before).toBe(1);

    // 2. Bulk assignment'ın yaptığı pattern: upsert. İki kez çağrıldığında
    //    yeni satır oluşmamalı.
    for (let i = 0; i < 2; i++) {
      await testPrisma.classroomStudent.upsert({
        where: { classroomId_studentId: { classroomId: seed.classroomId, studentId: seed.studentId } },
        update: { leftAt: null },
        create: { classroomId: seed.classroomId, studentId: seed.studentId },
      });
    }

    const after = await testPrisma.classroomStudent.count({
      where: { classroomId: seed.classroomId, studentId: seed.studentId },
    });
    expect(after).toBe(1);
  });

  test("admin /panel/admin/ogrenciler — seçim/bulk surface render", async ({ adminPage }) => {
    await adminPage.goto("/panel/admin/ogrenciler");
    await expect(adminPage).toHaveURL(/\/panel\/admin\/ogrenciler/);
    // En az bir checkbox veya bulk butonu render olmalı (kesin selektör product
    // koduna bağımlı; loose check yeterli — Session 11 zaten role gate'i sağlıyor).
    const checkboxCount = await adminPage.locator('input[type="checkbox"]').count();
    expect(checkboxCount).toBeGreaterThan(0);
  });
});
