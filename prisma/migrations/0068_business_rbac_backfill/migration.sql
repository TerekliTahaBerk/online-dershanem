-- İşletme Paneli erişimi artık YALNIZ `business_role_assignments` üzerinden
-- çözümlenir. Önceki kod `User.role = 'ADMIN'` olan herkesi otomatik olarak
-- bütün aktif iş birimlerinde SUPER_ADMIN kabul ediyordu; bu davranış
-- kaldırıldı (bkz. lib/business/permissions.ts).
--
-- Bu migration olmadan, deploy anında mevcut yöneticiler işletme alanından
-- tamamen kilitlenirdi. Burada o örtük yetki, açık ve denetlenebilir atama
-- satırlarına dönüştürülür.
--
-- Güvenlik notu: yalnız ZATEN erişimi olan kullanıcılara, ZATEN sahip
-- oldukları yetki verilir. Hiçbir kullanıcı yeni yetki kazanmaz.
--
-- Idempotent: ON CONFLICT DO NOTHING sayesinde tekrar çalıştırılabilir.
-- Veri kaybı yoktur; yalnız satır ekler.
--
-- GERİ ALMA (rollback):
--   DELETE FROM "business_role_assignments"
--   WHERE "id" LIKE 'bootstrap-superadmin-%';
-- Bu, migration'ın eklediği satırları hedefler; elle yapılan atamalara
-- dokunmaz.

INSERT INTO "business_role_assignments" ("id", "user_id", "business_unit_id", "role", "created_at")
SELECT
    'bootstrap-superadmin-' || substr(md5(u."id" || ':' || bu."id"), 1, 24),
    u."id",
    bu."id",
    'SUPER_ADMIN'::"BusinessRole",
    CURRENT_TIMESTAMP
FROM "users" u
CROSS JOIN "business_units" bu
WHERE u."role" = 'ADMIN'
  AND u."status" = 'ACTIVE'
  AND bu."is_active" = true
ON CONFLICT ("user_id", "business_unit_id", "role") DO NOTHING;
