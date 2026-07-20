CREATE TYPE "OdkExamFamily" AS ENUM ('LGS', 'TYT', 'AYT');
CREATE TYPE "OdkExamStatus" AS ENUM ('DRAFT', 'READY', 'SCHEDULED', 'LIVE', 'ENDED', 'SCORED', 'RELEASED', 'ARCHIVED');
CREATE TYPE "OdkExamVersionStatus" AS ENUM ('DRAFT', 'LOCKED', 'RETIRED');
CREATE TYPE "OdkQuestionDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');
CREATE TYPE "OdkAnswerOption" AS ENUM ('A', 'B', 'C', 'D', 'E');
CREATE TYPE "OdkExamFileType" AS ENUM ('BOOKLET_PDF', 'ANSWER_KEY_PDF');

CREATE TABLE "odk_scoring_policies" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "wrong_penalty" DECIMAL(5,2) NOT NULL,
  "minimum_net_is_zero" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "odk_scoring_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "odk_scoring_policies_wrong_penalty_check" CHECK ("wrong_penalty" > 0)
);
CREATE UNIQUE INDEX "odk_scoring_policies_code_key" ON "odk_scoring_policies"("code");

INSERT INTO "odk_scoring_policies" ("id", "code", "title", "wrong_penalty") VALUES
  ('odk_policy_lgs_math_v1', 'LGS_MATH_V1', 'LGS Matematik · 3 yanlış 1 doğru', 3.00),
  ('odk_policy_yks_math_v1', 'YKS_MATH_V1', 'TYT/AYT Matematik · 4 yanlış 1 doğru', 4.00);

CREATE TABLE "odk_exam_series" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "family" "OdkExamFamily" NOT NULL,
  "academic_year" INTEGER NOT NULL,
  "class_level" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_exam_series_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "odk_exam_series_academic_year_check" CHECK ("academic_year" BETWEEN 2020 AND 2100)
);
CREATE UNIQUE INDEX "odk_exam_series_slug_key" ON "odk_exam_series"("slug");
CREATE INDEX "odk_exam_series_family_academic_year_is_active_idx" ON "odk_exam_series"("family", "academic_year", "is_active");
CREATE INDEX "odk_exam_series_created_by_id_created_at_idx" ON "odk_exam_series"("created_by_id", "created_at");

CREATE TABLE "odk_exams" (
  "id" TEXT NOT NULL,
  "series_id" TEXT,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "family" "OdkExamFamily" NOT NULL,
  "status" "OdkExamStatus" NOT NULL DEFAULT 'DRAFT',
  "current_version_id" TEXT,
  "starts_at" TIMESTAMP(3),
  "ends_at" TIMESTAMP(3),
  "late_entry_minutes" INTEGER NOT NULL DEFAULT 0,
  "attempt_limit" INTEGER NOT NULL DEFAULT 1,
  "meet_required" BOOLEAN NOT NULL DEFAULT true,
  "meet_url" TEXT,
  "answer_key_released_at" TIMESTAMP(3),
  "results_released_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_exams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "odk_exams_time_window_check" CHECK ("ends_at" IS NULL OR "starts_at" IS NULL OR "ends_at" > "starts_at"),
  CONSTRAINT "odk_exams_late_entry_check" CHECK ("late_entry_minutes" BETWEEN 0 AND 120),
  CONSTRAINT "odk_exams_attempt_limit_check" CHECK ("attempt_limit" BETWEEN 1 AND 5)
);
CREATE UNIQUE INDEX "odk_exams_slug_key" ON "odk_exams"("slug");
CREATE UNIQUE INDEX "odk_exams_current_version_id_key" ON "odk_exams"("current_version_id");
CREATE INDEX "odk_exams_family_status_starts_at_idx" ON "odk_exams"("family", "status", "starts_at");
CREATE INDEX "odk_exams_series_id_starts_at_idx" ON "odk_exams"("series_id", "starts_at");
CREATE INDEX "odk_exams_status_starts_at_ends_at_idx" ON "odk_exams"("status", "starts_at", "ends_at");

CREATE TABLE "odk_exam_versions" (
  "id" TEXT NOT NULL,
  "exam_id" TEXT NOT NULL,
  "version_number" INTEGER NOT NULL,
  "status" "OdkExamVersionStatus" NOT NULL DEFAULT 'DRAFT',
  "duration_minutes" INTEGER NOT NULL,
  "instructions" TEXT,
  "scoring_policy_id" TEXT NOT NULL,
  "created_by_id" TEXT NOT NULL,
  "locked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_exam_versions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "odk_exam_versions_number_check" CHECK ("version_number" > 0),
  CONSTRAINT "odk_exam_versions_duration_check" CHECK ("duration_minutes" BETWEEN 5 AND 360)
);
CREATE UNIQUE INDEX "odk_exam_versions_exam_id_version_number_key" ON "odk_exam_versions"("exam_id", "version_number");
CREATE INDEX "odk_exam_versions_exam_id_status_idx" ON "odk_exam_versions"("exam_id", "status");
CREATE INDEX "odk_exam_versions_created_by_id_created_at_idx" ON "odk_exam_versions"("created_by_id", "created_at");

CREATE TABLE "odk_exam_sections" (
  "id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "question_count" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_exam_sections_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "odk_exam_sections_position_check" CHECK ("position" >= 0),
  CONSTRAINT "odk_exam_sections_question_count_check" CHECK ("question_count" BETWEEN 1 AND 200)
);
CREATE UNIQUE INDEX "odk_exam_sections_version_id_code_key" ON "odk_exam_sections"("version_id", "code");
CREATE UNIQUE INDEX "odk_exam_sections_version_id_position_key" ON "odk_exam_sections"("version_id", "position");
CREATE INDEX "odk_exam_sections_version_id_position_idx" ON "odk_exam_sections"("version_id", "position");

CREATE TABLE "odk_exam_questions" (
  "id" TEXT NOT NULL,
  "section_id" TEXT NOT NULL,
  "question_number" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "correct_option" "OdkAnswerOption",
  "difficulty" "OdkQuestionDifficulty" NOT NULL DEFAULT 'MEDIUM',
  "booklet_page" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_exam_questions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "odk_exam_questions_number_check" CHECK ("question_number" > 0),
  CONSTRAINT "odk_exam_questions_position_check" CHECK ("position" >= 0),
  CONSTRAINT "odk_exam_questions_page_check" CHECK ("booklet_page" IS NULL OR "booklet_page" > 0)
);
CREATE UNIQUE INDEX "odk_exam_questions_section_id_question_number_key" ON "odk_exam_questions"("section_id", "question_number");
CREATE UNIQUE INDEX "odk_exam_questions_section_id_position_key" ON "odk_exam_questions"("section_id", "position");
CREATE INDEX "odk_exam_questions_section_id_position_idx" ON "odk_exam_questions"("section_id", "position");

CREATE TABLE "odk_question_outcomes" (
  "question_id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "is_primary" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "odk_question_outcomes_pkey" PRIMARY KEY ("question_id", "outcome_id")
);
CREATE INDEX "odk_question_outcomes_outcome_id_question_id_idx" ON "odk_question_outcomes"("outcome_id", "question_id");

CREATE TABLE "odk_exam_files" (
  "id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "type" "OdkExamFileType" NOT NULL,
  "blob_pathname" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "checksum" TEXT,
  "uploaded_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "odk_exam_files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "odk_exam_files_byte_size_check" CHECK ("byte_size" > 0)
);
CREATE UNIQUE INDEX "odk_exam_files_version_id_type_key" ON "odk_exam_files"("version_id", "type");
CREATE INDEX "odk_exam_files_uploaded_by_id_created_at_idx" ON "odk_exam_files"("uploaded_by_id", "created_at");

CREATE TABLE "odk_package_exams" (
  "package_id" TEXT NOT NULL,
  "exam_id" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "odk_package_exams_pkey" PRIMARY KEY ("package_id", "exam_id")
);
CREATE INDEX "odk_package_exams_exam_id_idx" ON "odk_package_exams"("exam_id");

ALTER TABLE "odk_exam_series" ADD CONSTRAINT "odk_exam_series_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exams" ADD CONSTRAINT "odk_exams_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "odk_exam_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "odk_exams" ADD CONSTRAINT "odk_exams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exam_versions" ADD CONSTRAINT "odk_exam_versions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_exam_versions" ADD CONSTRAINT "odk_exam_versions_scoring_policy_id_fkey" FOREIGN KEY ("scoring_policy_id") REFERENCES "odk_scoring_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exam_versions" ADD CONSTRAINT "odk_exam_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exams" ADD CONSTRAINT "odk_exams_current_version_id_fkey" FOREIGN KEY ("current_version_id") REFERENCES "odk_exam_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "odk_exam_sections" ADD CONSTRAINT "odk_exam_sections_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "odk_exam_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_exam_questions" ADD CONSTRAINT "odk_exam_questions_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "odk_exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_question_outcomes" ADD CONSTRAINT "odk_question_outcomes_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "odk_exam_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_question_outcomes" ADD CONSTRAINT "odk_question_outcomes_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exam_files" ADD CONSTRAINT "odk_exam_files_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "odk_exam_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_exam_files" ADD CONSTRAINT "odk_exam_files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_package_exams" ADD CONSTRAINT "odk_package_exams_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "odk_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_package_exams" ADD CONSTRAINT "odk_package_exams_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
