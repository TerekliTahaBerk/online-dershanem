-- Deneme Ligi çoklu kitapçık: yöneticinin öğrenci başına kitapçık seçimi.
--
-- EKLEMELİ: nullable kolon. NULL = otomatik dengeli atama (mevcut davranış);
-- mevcut satırlar NULL kalır. Seçim yalnız öğrenci denemeye başlamadan önce
-- değiştirilebilir; başlamış denemenin kitapçığı `odk_exam_attempts.booklet_code`.
--
-- GERİ ALMA (uygulama önceki sürüme döndükten sonra):
--   SELECT id, exam_id, student_user_id, booklet_code FROM odk_exam_assignments WHERE booklet_code IS NOT NULL; -- raporla
--   ALTER TABLE "odk_exam_assignments" DROP COLUMN "booklet_code";

-- AlterTable
ALTER TABLE "odk_exam_assignments" ADD COLUMN "booklet_code" TEXT;
