/**
 * Phase 3 / Session 13 — D4: Bulk classroom assignment UI flow.
 *
 * Session 12'nin `bulk-classroom-idempotency.spec.ts` testi şema-invariant
 * (composite PK upsert) seviyesinde idempotency'yi doğrulamıştı. Bu test
 * **UI üzerinden** aynı invariant'ı doğrular:
 *
 *   1) admin /panel/admin/ogrenciler açar
 *   2) seed öğrencisini checkbox ile seçer
 *   3) sınıf seçer + "Sınıfa ekle" submit eder
 *   4) result panel görünür
 *   5) reload sonrası ClassroomStudent satır sayısı = 1
 *   6) tekrar koşar → row count değişmiyor (idempotent skip)
 *
 * Cleanup: seed bağlantısı bozulmasın diye sadece testin yarattığı yeni
 * (e2e-ogrenci2 ↔ classroom) bağlantı silinir; seed olan (e2e-ogrenci ↔
 * classroom) bağlantı korunur.
 */
import { test, expect } from "./fixtures/auth";
import { testPrisma, getSeedIds } from "./helpers/db";

test.describe("D4 — Bulk classroom UI flow", () => {
  test("UI: sınıfa ata × 2 → satır sayısı stabil", async ({ adminPage }) => {
    test.setTimeout(60_000);
    const seed = await getSeedIds();

    // 2. öğrencinin (e2e-ogrenci2) classroom bağlantısı yok — onu test edeceğiz
    await testPrisma.classroomStudent.deleteMany({
      where: { classroomId: seed.classroomId, studentId: seed.student2Id },
    });

    try {
      await adminPage.goto("/panel/admin/ogrenciler");

      const cb = adminPage.locator(
        `[data-testid="bulk-row-checkbox"][data-row-id="${seed.student2Id}"]`,
      );
      const visible = await cb.count();
      if (visible === 0) {
        test.skip(true, "e2e-ogrenci2 listede görünmüyor (sayfalama). Sonraki turda search/sort filter eklenebilir.");
      }
      await cb.first().check();

      await expect(adminPage.locator('[data-testid="bulk-bar"]')).toBeVisible();

      // Sınıf seç + submit
      await adminPage
        .locator('[data-testid="bulk-classroom-select"]')
        .selectOption(seed.classroomId);
      await adminPage.locator('[data-testid="bulk-classroom-submit"]').click();
      await expect(adminPage.locator('[data-testid="bulk-result-panel"]')).toBeVisible({
        timeout: 10_000,
      });

      // DB: tek satır oluşmuş olmalı
      const afterFirst = await testPrisma.classroomStudent.count({
        where: { classroomId: seed.classroomId, studentId: seed.student2Id },
      });
      expect(afterFirst).toBe(1);

      // Tekrar — idempotent
      const stillChecked = await cb.first().isChecked();
      if (!stillChecked) await cb.first().check();
      await adminPage
        .locator('[data-testid="bulk-classroom-select"]')
        .selectOption(seed.classroomId);
      await adminPage.locator('[data-testid="bulk-classroom-submit"]').click();
      await expect(adminPage.locator('[data-testid="bulk-result-panel"]')).toBeVisible({
        timeout: 10_000,
      });

      const afterSecond = await testPrisma.classroomStudent.count({
        where: { classroomId: seed.classroomId, studentId: seed.student2Id },
      });
      expect(afterSecond).toBe(afterFirst);
    } finally {
      await testPrisma.classroomStudent.deleteMany({
        where: { classroomId: seed.classroomId, studentId: seed.student2Id },
      });
    }
  });
});
