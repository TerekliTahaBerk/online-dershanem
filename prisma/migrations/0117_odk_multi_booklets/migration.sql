-- Deneme Ligi çoklu kitapçık (A/B/C/D/E).
--
-- EKLEMELİ: yeni tablo + `odk_exam_files.booklet_code` (NOT NULL DEFAULT '' =
-- kitapçık türünden bağımsız). A kitapçığı kanoniktir (mevcut soru numaraları);
-- B–E kitapçıklarının sırası yeni tabloda tutulur. Mevcut denemeler tek
-- kitapçıklı kalır, mevcut satırlar ve davranış değişmez. Cevaplar ve puanlar
-- kanonik soru kimliğiyle saklandığı için puanlama değişmez.
--
-- GERİ ALMA (uygulama önceki sürüme döndükten sonra):
--   1. SELECT * FROM odk_exam_files WHERE booklet_code <> '';  -- raporla
--      DELETE FROM odk_exam_files WHERE booklet_code <> '';    -- onaydan sonra
--   2. DROP INDEX "odk_exam_files_version_id_type_session_key_booklet_code_key";
--      CREATE UNIQUE INDEX "odk_exam_files_version_id_type_session_key_key" ON "odk_exam_files"("version_id", "type", "session_key");
--      ALTER TABLE "odk_exam_files" DROP COLUMN "booklet_code";
--   3. DROP TABLE "odk_booklet_question_orders";
--   (odk_exam_attempts.booklet_code zaten vardı; dokunulmaz.)

-- CreateTable
CREATE TABLE "odk_booklet_question_orders" (
    "id" TEXT NOT NULL,
    "version_id" TEXT NOT NULL,
    "booklet_code" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "booklet_question_number" INTEGER NOT NULL,
    "booklet_page" INTEGER,

    CONSTRAINT "odk_booklet_question_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "odk_booklet_question_orders_version_id_booklet_code_questio_key" ON "odk_booklet_question_orders"("version_id", "booklet_code", "question_id");
CREATE UNIQUE INDEX "odk_booklet_question_orders_version_id_booklet_code_section_key" ON "odk_booklet_question_orders"("version_id", "booklet_code", "section_id", "booklet_question_number");

-- AddForeignKey
ALTER TABLE "odk_booklet_question_orders" ADD CONSTRAINT "odk_booklet_question_orders_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "odk_exam_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_booklet_question_orders" ADD CONSTRAINT "odk_booklet_question_orders_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "odk_exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "odk_exam_files" ADD COLUMN "booklet_code" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX "odk_exam_files_version_id_type_session_key_key";

-- CreateIndex
CREATE UNIQUE INDEX "odk_exam_files_version_id_type_session_key_booklet_code_key" ON "odk_exam_files"("version_id", "type", "session_key", "booklet_code");
