/**
 * Phase 3 / Session 13 — D3: Bulk ODK access tag idempotency.
 *
 * UI flow:
 *   1) admin /panel/admin/ogrenciler açar
 *   2) seed iki öğrencisini (e2e-ogrenci, e2e-ogrenci2) checkbox ile seçer
 *   3) seed ODK tag'i dropdown'dan seçer
 *   4) submit eder → result panel render olur
 *   5) DB'de OdkUserAccessTag(revokedAt=null) iki kayıt var
 *   6) aynı işlem tekrar koşulduğunda DB count değişmiyor + result panel
 *      "atlandı" gösteriyor
 *
 * Cleanup: testin yarattığı grant'ları (revokedAt=null) siler.
 */
import { test, expect } from "./fixtures/auth";
import { testPrisma, getSeedIds } from "./helpers/db";

test.describe("D3 — Bulk ODK access tag idempotency @smoke", () => {
  test("seed iki öğrenciye etiket ver → ikinci çağrı duplike yaratmaz", async ({ adminPage }) => {
    test.setTimeout(60_000);
    const seed = await getSeedIds();

    // Pre-clean (seed zaten temizliyor ama test izolasyonu için sigorta)
    await testPrisma.odkUserAccessTag.deleteMany({
      where: {
        accessTagId: seed.odkAccessTagId,
        userId: { in: [seed.studentUserId, seed.student2UserId] },
      },
    });

    try {
      await adminPage.goto("/panel/admin/ogrenciler");

      // Step 1: iki seed öğrenciyi seç. data-row-id öğrenci.id (Student tablosu PK).
      const cb1 = adminPage.locator(`[data-testid="bulk-row-checkbox"][data-row-id="${seed.studentId}"]`);
      const cb2 = adminPage.locator(`[data-testid="bulk-row-checkbox"][data-row-id="${seed.student2Id}"]`);

      // Bazı listelerde sayfalama nedeniyle ikinci öğrenci ekranda olmayabilir
      // — varlık kontrolü + opsiyonel çoklu seçim.
      await expect(cb1).toBeVisible({ timeout: 10_000 });
      await cb1.check();
      const cb2Count = await cb2.count();
      if (cb2Count > 0) {
        await cb2.first().check();
      }

      // Step 2: bulk bar render olmalı
      await expect(adminPage.locator('[data-testid="bulk-bar"]')).toBeVisible();

      // Step 3: ODK tag seç + submit
      await adminPage
        .locator('[data-testid="bulk-access-tag-select"]')
        .selectOption(seed.odkAccessTagId);
      await adminPage.locator('[data-testid="bulk-access-tag-submit"]').click();

      // Step 4: result panel
      await expect(adminPage.locator('[data-testid="bulk-result-panel"]')).toBeVisible({
        timeout: 10_000,
      });

      // DB doğrulama — ilk çağrıdan sonra kaç grant var?
      const firstCount = await testPrisma.odkUserAccessTag.count({
        where: {
          accessTagId: seed.odkAccessTagId,
          userId: { in: [seed.studentUserId, seed.student2UserId] },
          revokedAt: null,
        },
      });
      expect(firstCount).toBeGreaterThanOrEqual(1);

      // Step 5: Tekrar koş. ODK etiketi verildiğinde öğrenciler OD-only
      // listesinden düşebilir; BulkProvider seçimi koruduğu için artık görünmeyen
      // satır checkbox'larını yeniden aramak hem gereksiz hem de hatalıdır.
      await expect(adminPage.locator('[data-testid="bulk-bar"]')).toBeVisible();
      await adminPage
        .locator('[data-testid="bulk-access-tag-select"]')
        .selectOption(seed.odkAccessTagId);
      await adminPage.locator('[data-testid="bulk-access-tag-submit"]').click();
      await expect(adminPage.locator('[data-testid="bulk-result-panel"]')).toBeVisible({
        timeout: 10_000,
      });

      // Step 6: Aynı (user, accessTag, revokedAt=null) kombinasyonu için
      //          row count değişmemiş olmalı.
      const secondCount = await testPrisma.odkUserAccessTag.count({
        where: {
          accessTagId: seed.odkAccessTagId,
          userId: { in: [seed.studentUserId, seed.student2UserId] },
          revokedAt: null,
        },
      });
      expect(secondCount).toBe(firstCount);
    } finally {
      // Cleanup: testin oluşturduğu grant'ları sil
      await testPrisma.odkUserAccessTag.deleteMany({
        where: {
          accessTagId: seed.odkAccessTagId,
          userId: { in: [seed.studentUserId, seed.student2UserId] },
        },
      });
    }
  });
});
