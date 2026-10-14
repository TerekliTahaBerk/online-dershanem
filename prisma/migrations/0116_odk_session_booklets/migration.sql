-- Deneme Ligi oturum bazlı kitapçık (LGS: Sözel ve Sayısal ayrı PDF).
--
-- EKLEMELİ: mevcut her dosya satırı `session_key = ''` (tüm deneme) olur ve
-- bugünkü davranış aynen sürer. Tekillik (sürüm, tür) → (sürüm, tür, oturum)
-- genişler; aynı oturum için yine tek kitapçık vardır. Veri silinmez.
--
-- GERİ ALMA (uygulama önceki sürüme döndükten sonra):
--   1. Oturuma özel kitapçıkları raporla:  SELECT * FROM odk_exam_files WHERE session_key <> '';
--      (Bunlar eski sürümde okunmaz; gerekiyorsa birleşik PDF yüklenmelidir.)
--   2. DELETE FROM odk_exam_files WHERE session_key <> '';   -- yalnız 1. adım onaylandıysa
--   3. DROP INDEX "odk_exam_files_version_id_type_session_key_key";
--      CREATE UNIQUE INDEX "odk_exam_files_version_id_type_key" ON "odk_exam_files"("version_id", "type");
--   4. ALTER TABLE "odk_exam_files" DROP COLUMN "session_key";

-- AlterTable
ALTER TABLE "odk_exam_files" ADD COLUMN "session_key" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX "odk_exam_files_version_id_type_key";

-- CreateIndex
CREATE UNIQUE INDEX "odk_exam_files_version_id_type_session_key_key" ON "odk_exam_files"("version_id", "type", "session_key");
