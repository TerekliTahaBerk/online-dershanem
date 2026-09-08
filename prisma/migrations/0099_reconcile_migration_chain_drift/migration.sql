-- Migration zinciri ile `schema.prisma` arasındaki BİRİKMİŞ SAPMAYI kapatır.
--
-- `prisma migrate diff --from-migrations --to-schema-datamodel` 22 fark
-- üretiyordu. Pratik sonucu şuydu: `migrate deploy` ile kurulan bir veritabanı
-- (temiz CI, yeni ortam) ile `db push` ile kurulan bir veritabanı (yerel test,
-- üretimin ilk hâli) AYNI ŞEMAYA sahip değildi. En görünür etkisi
-- `student_goals(student_id, status)` indeksinin migration yolunda hiç
-- oluşturulmamış olmasıydı — hedef ekranı yerelde indeksli, o yoldan kurulan
-- ortamlarda indekssiz çalışıyordu.
--
-- Diğer farklar indeks ADI kaymaları ve şemanın artık bildirmediği iki eski
-- indeks; işlevsel değiller ama her `migrate diff` çıktısını kirletiyor ve
-- gerçek sapmayı gizliyorlardı.
--
-- HER İFADE KOŞULLU: üretim şeması bir noktada `db push` ile kurulup migration
-- geçmişi üzerine bindirilmiş (bkz. 0000_baseline'ın boş olması), bu yüzden
-- nesnelerin bir kısmı zaten hedef adında olabilir. Bu migration iki durumda da
-- güvenle koşar ve tekrar koşturulabilir.

-- DropIndex
DROP INDEX IF EXISTS "parent_students_student_id_idx";

-- DropIndex
DROP INDEX IF EXISTS "teacher_home_snapshots_generated_at_idx";

-- AlterTable
ALTER TABLE "lesson_series" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "student_goals_student_id_status_idx" ON "student_goals"("student_id", "status");

-- RenameIndex
ALTER INDEX IF EXISTS "cross_product_event_outbox_student_id_event_type_occurred_at_id" RENAME TO "cross_product_event_outbox_student_id_event_type_occurred_a_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_answer_key_revisions_changed_by_idx" RENAME TO "odk_answer_key_revisions_changed_by_id_created_at_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_answer_key_revisions_version_revision_key" RENAME TO "odk_answer_key_revisions_version_id_revision_number_key";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_attempt_events_attempt_sequence_key" RENAME TO "odk_attempt_events_attempt_id_sequence_key";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_attempt_events_attempt_type_time_idx" RENAME TO "odk_attempt_events_attempt_id_type_server_occurred_at_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_attempt_events_type_time_idx" RENAME TO "odk_attempt_events_type_server_occurred_at_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_attempt_question_timings_attempt_question_key" RENAME TO "odk_attempt_question_timings_attempt_id_question_id_key";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_attempt_question_timings_question_idx" RENAME TO "odk_attempt_question_timings_question_id_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_exam_assignments_exam_active_idx" RENAME TO "odk_exam_assignments_exam_id_is_active_assigned_at_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_exam_assignments_exam_student_key" RENAME TO "odk_exam_assignments_exam_id_student_user_id_key";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_exam_assignments_source_idx" RENAME TO "odk_exam_assignments_source_source_ref_id_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_exam_assignments_student_active_idx" RENAME TO "odk_exam_assignments_student_user_id_is_active_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_exam_attempts_exam_integrity_idx" RENAME TO "odk_exam_attempts_exam_id_integrity_level_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_exam_questions_section_booklet_idx" RENAME TO "odk_exam_questions_section_id_booklet_code_booklet_question_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_import_audits_exam_kind_idx" RENAME TO "odk_import_audits_exam_id_kind_created_at_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "odk_import_audits_version_status_idx" RENAME TO "odk_import_audits_version_id_status_idx";

-- RenameIndex
ALTER INDEX IF EXISTS "student_progress_evidence_student_id_outcome_id_source_type_sou" RENAME TO "student_progress_evidence_student_id_outcome_id_source_type_key";

-- RenameIndex
ALTER INDEX IF EXISTS "student_progress_evidence_student_id_source_type_occurred_at_id" RENAME TO "student_progress_evidence_student_id_source_type_occurred_a_idx";
