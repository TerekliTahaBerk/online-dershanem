-- ODK professional exam system: multi-section templates, integrity events,
-- assignments, answer-key revisions, import audits, publication status.

CREATE TYPE "OdkAttemptEventType" AS ENUM (
  'EXAM_STARTED', 'QUESTION_OPENED', 'QUESTION_CLOSED', 'ANSWER_SELECTED', 'ANSWER_CHANGED',
  'QUESTION_FLAGGED', 'SECTION_CHANGED', 'TAB_HIDDEN', 'TAB_VISIBLE', 'WINDOW_BLUR', 'WINDOW_FOCUS',
  'FULLSCREEN_ENTER', 'FULLSCREEN_EXIT', 'COPY_ATTEMPT', 'PASTE_ATTEMPT', 'CONTEXT_MENU',
  'NETWORK_OFFLINE', 'NETWORK_ONLINE', 'EXAM_SUBMITTED', 'AUTO_SUBMITTED'
);

CREATE TYPE "OdkIntegrityLevel" AS ENUM ('NORMAL', 'REVIEW', 'HIGH');
CREATE TYPE "OdkAssignmentSource" AS ENUM ('STUDENT', 'GROUP', 'CLASS', 'COHORT', 'BULK');
CREATE TYPE "OdkQuestionContentType" AS ENUM ('BOOKLET_PDF', 'IMAGE_URL', 'RICH_CONTENT');
CREATE TYPE "OdkScorePublicationStatus" AS ENUM ('HIDDEN', 'PUBLISHED');
CREATE TYPE "OdkImportKind" AS ENUM ('ANSWER_KEY', 'OUTCOME');
CREATE TYPE "OdkImportStatus" AS ENUM ('PREVIEW', 'COMMITTED', 'REJECTED');
CREATE TYPE "OdkExamStructureMode" AS ENUM ('MATH_ONLY', 'FULL_TEMPLATE');

ALTER TYPE "OdkAttemptStatus" ADD VALUE IF NOT EXISTS 'REVIEW_REQUIRED';

ALTER TABLE "odk_exams"
  ADD COLUMN IF NOT EXISTS "structure_mode" "OdkExamStructureMode" NOT NULL DEFAULT 'MATH_ONLY',
  ADD COLUMN IF NOT EXISTS "template_code" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "internal_code" TEXT,
  ADD COLUMN IF NOT EXISTS "academic_year" INTEGER,
  ADD COLUMN IF NOT EXISTS "publisher" TEXT,
  ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "content_locked_at" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "odk_exams_internal_code_idx" ON "odk_exams"("internal_code");

ALTER TABLE "odk_exam_versions"
  ADD COLUMN IF NOT EXISTS "auto_submit" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "extra_time_policy" JSONB,
  ADD COLUMN IF NOT EXISTS "settings" JSONB NOT NULL DEFAULT '{}';

ALTER TABLE "odk_exam_sections"
  ADD COLUMN IF NOT EXISTS "duration_minutes" INTEGER,
  ADD COLUMN IF NOT EXISTS "question_start" INTEGER,
  ADD COLUMN IF NOT EXISTS "question_end" INTEGER;

ALTER TABLE "odk_exam_questions"
  ADD COLUMN IF NOT EXISTS "booklet_code" TEXT NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS "booklet_question_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "canonical_question_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "content_type" "OdkQuestionContentType" NOT NULL DEFAULT 'BOOKLET_PDF',
  ADD COLUMN IF NOT EXISTS "asset_url" TEXT;

CREATE INDEX IF NOT EXISTS "odk_exam_questions_section_booklet_idx"
  ON "odk_exam_questions"("section_id", "booklet_code", "booklet_question_number");

ALTER TABLE "odk_exam_attempts"
  ADD COLUMN IF NOT EXISTS "booklet_code" TEXT NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS "ip_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "client_meta" JSONB,
  ADD COLUMN IF NOT EXISTS "session_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "integrity_level" "OdkIntegrityLevel" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS "integrity_reasons" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "integrity_reviewed_at" TIMESTAMPTZ(3);

CREATE INDEX IF NOT EXISTS "odk_exam_attempts_exam_integrity_idx"
  ON "odk_exam_attempts"("exam_id", "integrity_level");

ALTER TABLE "odk_attempt_answers"
  ADD COLUMN IF NOT EXISTS "changed_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "first_answered_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "last_changed_at" TIMESTAMPTZ(3);

ALTER TABLE "odk_attempt_scores"
  ADD COLUMN IF NOT EXISTS "section_breakdown" JSONB,
  ADD COLUMN IF NOT EXISTS "publication_status" "OdkScorePublicationStatus" NOT NULL DEFAULT 'HIDDEN',
  ADD COLUMN IF NOT EXISTS "active_duration_ms" INTEGER;

CREATE INDEX IF NOT EXISTS "odk_attempt_scores_publication_status_idx"
  ON "odk_attempt_scores"("publication_status");

ALTER TABLE "odk_attempt_outcome_scores"
  ADD COLUMN IF NOT EXISTS "active_duration_ms" INTEGER;

CREATE TABLE IF NOT EXISTS "odk_attempt_events" (
  "id" TEXT NOT NULL,
  "attempt_id" TEXT NOT NULL,
  "type" "OdkAttemptEventType" NOT NULL,
  "sequence" INTEGER NOT NULL,
  "question_id" TEXT,
  "client_occurred_at" TIMESTAMPTZ(3),
  "server_occurred_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  CONSTRAINT "odk_attempt_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "odk_attempt_events_attempt_sequence_key"
  ON "odk_attempt_events"("attempt_id", "sequence");
CREATE INDEX IF NOT EXISTS "odk_attempt_events_attempt_type_time_idx"
  ON "odk_attempt_events"("attempt_id", "type", "server_occurred_at");
CREATE INDEX IF NOT EXISTS "odk_attempt_events_type_time_idx"
  ON "odk_attempt_events"("type", "server_occurred_at");

CREATE TABLE IF NOT EXISTS "odk_attempt_question_timings" (
  "id" TEXT NOT NULL,
  "attempt_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "visit_count" INTEGER NOT NULL DEFAULT 1,
  "active_duration_ms" INTEGER NOT NULL DEFAULT 0,
  "first_entered_at" TIMESTAMPTZ(3) NOT NULL,
  "last_left_at" TIMESTAMPTZ(3),
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "odk_attempt_question_timings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "odk_attempt_question_timings_attempt_question_key"
  ON "odk_attempt_question_timings"("attempt_id", "question_id");
CREATE INDEX IF NOT EXISTS "odk_attempt_question_timings_question_idx"
  ON "odk_attempt_question_timings"("question_id");

CREATE TABLE IF NOT EXISTS "odk_exam_assignments" (
  "id" TEXT NOT NULL,
  "exam_id" TEXT NOT NULL,
  "student_user_id" TEXT NOT NULL,
  "source" "OdkAssignmentSource" NOT NULL,
  "source_ref_id" TEXT,
  "snapshot" JSONB NOT NULL DEFAULT '{}',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "assigned_by_id" TEXT NOT NULL,
  "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMPTZ(3),
  CONSTRAINT "odk_exam_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "odk_exam_assignments_exam_student_key"
  ON "odk_exam_assignments"("exam_id", "student_user_id");
CREATE INDEX IF NOT EXISTS "odk_exam_assignments_student_active_idx"
  ON "odk_exam_assignments"("student_user_id", "is_active");
CREATE INDEX IF NOT EXISTS "odk_exam_assignments_exam_active_idx"
  ON "odk_exam_assignments"("exam_id", "is_active", "assigned_at");
CREATE INDEX IF NOT EXISTS "odk_exam_assignments_source_idx"
  ON "odk_exam_assignments"("source", "source_ref_id");

CREATE TABLE IF NOT EXISTS "odk_answer_key_revisions" (
  "id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "revision_number" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "previous_answers" JSONB NOT NULL,
  "next_answers" JSONB NOT NULL,
  "changed_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "rescore_requested_at" TIMESTAMPTZ(3),
  "rescore_completed_at" TIMESTAMPTZ(3),
  CONSTRAINT "odk_answer_key_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "odk_answer_key_revisions_version_revision_key"
  ON "odk_answer_key_revisions"("version_id", "revision_number");
CREATE INDEX IF NOT EXISTS "odk_answer_key_revisions_changed_by_idx"
  ON "odk_answer_key_revisions"("changed_by_id", "created_at");

CREATE TABLE IF NOT EXISTS "odk_import_audits" (
  "id" TEXT NOT NULL,
  "exam_id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "kind" "OdkImportKind" NOT NULL,
  "schema_version" TEXT NOT NULL,
  "status" "OdkImportStatus" NOT NULL DEFAULT 'PREVIEW',
  "payload_hash" TEXT NOT NULL,
  "raw_payload" JSONB NOT NULL,
  "preview_summary" JSONB NOT NULL,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "committed_at" TIMESTAMPTZ(3),
  CONSTRAINT "odk_import_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "odk_import_audits_exam_kind_idx"
  ON "odk_import_audits"("exam_id", "kind", "created_at");
CREATE INDEX IF NOT EXISTS "odk_import_audits_version_status_idx"
  ON "odk_import_audits"("version_id", "status");

ALTER TABLE "odk_attempt_events"
  ADD CONSTRAINT "odk_attempt_events_attempt_id_fkey"
  FOREIGN KEY ("attempt_id") REFERENCES "odk_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_events"
  ADD CONSTRAINT "odk_attempt_events_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "odk_exam_questions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "odk_attempt_question_timings"
  ADD CONSTRAINT "odk_attempt_question_timings_attempt_id_fkey"
  FOREIGN KEY ("attempt_id") REFERENCES "odk_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_question_timings"
  ADD CONSTRAINT "odk_attempt_question_timings_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "odk_exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "odk_exam_assignments"
  ADD CONSTRAINT "odk_exam_assignments_exam_id_fkey"
  FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_exam_assignments"
  ADD CONSTRAINT "odk_exam_assignments_student_user_id_fkey"
  FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exam_assignments"
  ADD CONSTRAINT "odk_exam_assignments_assigned_by_id_fkey"
  FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "odk_answer_key_revisions"
  ADD CONSTRAINT "odk_answer_key_revisions_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "odk_exam_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_answer_key_revisions"
  ADD CONSTRAINT "odk_answer_key_revisions_changed_by_id_fkey"
  FOREIGN KEY ("changed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "odk_import_audits"
  ADD CONSTRAINT "odk_import_audits_exam_id_fkey"
  FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_import_audits"
  ADD CONSTRAINT "odk_import_audits_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "odk_exam_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_import_audits"
  ADD CONSTRAINT "odk_import_audits_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "odk_scoring_policies" ("id", "code", "title", "wrong_penalty", "minimum_net_is_zero", "created_at")
VALUES
  ('odk_policy_lgs_full_v1', 'LGS_FULL_V1', 'LGS Tam Deneme · 3 yanlış 1 doğru', 3.00, true, CURRENT_TIMESTAMP),
  ('odk_policy_tyt_full_v1', 'TYT_FULL_V1', 'TYT Tam Deneme · 4 yanlış 1 doğru', 4.00, true, CURRENT_TIMESTAMP),
  ('odk_policy_ayt_full_v1', 'AYT_FULL_V1', 'AYT Tam Deneme · 4 yanlış 1 doğru', 4.00, true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;
