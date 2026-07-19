CREATE TYPE "CurriculumExam" AS ENUM ('LGS', 'TYT', 'AYT', 'YDT');
CREATE TYPE "CurriculumStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');
CREATE TYPE "OutcomeEvidenceType" AS ENUM ('TAUGHT', 'OBSERVED', 'INDEPENDENT', 'NEEDS_REVIEW');

ALTER TABLE "lessons" ADD COLUMN "outcome_skip_reason" TEXT;
ALTER TABLE "assignments" ADD COLUMN "outcome_skip_reason" TEXT;

CREATE TABLE "curriculum_versions" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "exam" "CurriculumExam" NOT NULL,
  "academic_year" INTEGER NOT NULL,
  "status" "CurriculumStatus" NOT NULL DEFAULT 'DRAFT',
  "source_url" TEXT,
  "created_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curriculum_versions_code_key" ON "curriculum_versions"("code");
CREATE INDEX "curriculum_versions_exam_academic_year_status_idx" ON "curriculum_versions"("exam", "academic_year", "status");

CREATE TABLE "curriculum_subjects" (
  "id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "curriculum_subjects_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curriculum_subjects_version_id_code_key" ON "curriculum_subjects"("version_id", "code");
CREATE INDEX "curriculum_subjects_version_id_position_idx" ON "curriculum_subjects"("version_id", "position");

CREATE TABLE "curriculum_units" (
  "id" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "curriculum_units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curriculum_units_subject_id_code_key" ON "curriculum_units"("subject_id", "code");
CREATE INDEX "curriculum_units_subject_id_position_idx" ON "curriculum_units"("subject_id", "position");

CREATE TABLE "curriculum_skills" (
  "id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "curriculum_skills_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curriculum_skills_version_id_code_key" ON "curriculum_skills"("version_id", "code");

CREATE TABLE "learning_outcomes" (
  "id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "learning_outcomes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "learning_outcomes_unit_id_code_key" ON "learning_outcomes"("unit_id", "code");
CREATE INDEX "learning_outcomes_is_active_updated_at_idx" ON "learning_outcomes"("is_active", "updated_at");

CREATE TABLE "outcome_skills" (
  "outcome_id" TEXT NOT NULL,
  "skill_id" TEXT NOT NULL,
  CONSTRAINT "outcome_skills_pkey" PRIMARY KEY ("outcome_id", "skill_id")
);

CREATE TABLE "lesson_outcomes" (
  "lesson_id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "evidence_type" "OutcomeEvidenceType" NOT NULL DEFAULT 'TAUGHT',
  "linked_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_outcomes_pkey" PRIMARY KEY ("lesson_id", "outcome_id")
);
CREATE INDEX "lesson_outcomes_outcome_id_evidence_type_created_at_idx" ON "lesson_outcomes"("outcome_id", "evidence_type", "created_at");

CREATE TABLE "assignment_outcomes" (
  "assignment_id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "linked_by_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_outcomes_pkey" PRIMARY KEY ("assignment_id", "outcome_id")
);
CREATE INDEX "assignment_outcomes_outcome_id_created_at_idx" ON "assignment_outcomes"("outcome_id", "created_at");

CREATE TABLE "outcome_favorites" (
  "user_id" TEXT NOT NULL,
  "outcome_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outcome_favorites_pkey" PRIMARY KEY ("user_id", "outcome_id")
);
CREATE INDEX "outcome_favorites_user_id_created_at_idx" ON "outcome_favorites"("user_id", "created_at");

ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "curriculum_subjects" ADD CONSTRAINT "curriculum_subjects_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "curriculum_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_units" ADD CONSTRAINT "curriculum_units_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "curriculum_subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_skills" ADD CONSTRAINT "curriculum_skills_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "curriculum_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "learning_outcomes" ADD CONSTRAINT "learning_outcomes_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "curriculum_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outcome_skills" ADD CONSTRAINT "outcome_skills_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outcome_skills" ADD CONSTRAINT "outcome_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "curriculum_skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_outcomes" ADD CONSTRAINT "lesson_outcomes_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "lesson_outcomes" ADD CONSTRAINT "lesson_outcomes_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lesson_outcomes" ADD CONSTRAINT "lesson_outcomes_linked_by_id_fkey" FOREIGN KEY ("linked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_outcomes" ADD CONSTRAINT "assignment_outcomes_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_outcomes" ADD CONSTRAINT "assignment_outcomes_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_outcomes" ADD CONSTRAINT "assignment_outcomes_linked_by_id_fkey" FOREIGN KEY ("linked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outcome_favorites" ADD CONSTRAINT "outcome_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "outcome_favorites" ADD CONSTRAINT "outcome_favorites_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
