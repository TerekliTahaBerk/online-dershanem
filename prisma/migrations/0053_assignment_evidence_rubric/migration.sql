CREATE TYPE "AssignmentSubmissionStatus" AS ENUM ('SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED');
CREATE TYPE "RubricLevel" AS ENUM ('NEEDS_WORK', 'DEVELOPING', 'MEETS');

ALTER TABLE "assignments" ADD COLUMN "evidence_required" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "assignment_rubric_criteria" (
  "id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "label" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_rubric_criteria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignment_submissions" (
  "id" TEXT NOT NULL,
  "assignment_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "attempt_number" INTEGER NOT NULL,
  "status" "AssignmentSubmissionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "text_evidence" TEXT NOT NULL,
  "feedback" TEXT,
  "idempotency_key" TEXT NOT NULL,
  "reviewer_id" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assignment_rubric_scores" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "criterion_id" TEXT NOT NULL,
  "level" "RubricLevel" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_rubric_scores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "assignment_rubric_criteria_assignment_id_position_key" ON "assignment_rubric_criteria"("assignment_id", "position");
CREATE INDEX "assignment_rubric_criteria_assignment_id_idx" ON "assignment_rubric_criteria"("assignment_id");
CREATE UNIQUE INDEX "assignment_submissions_idempotency_key_key" ON "assignment_submissions"("idempotency_key");
CREATE UNIQUE INDEX "assignment_submissions_assignment_id_student_id_attempt_number_key" ON "assignment_submissions"("assignment_id", "student_id", "attempt_number");
CREATE INDEX "assignment_submissions_assignment_id_status_submitted_at_idx" ON "assignment_submissions"("assignment_id", "status", "submitted_at");
CREATE INDEX "assignment_submissions_student_id_submitted_at_idx" ON "assignment_submissions"("student_id", "submitted_at");
CREATE UNIQUE INDEX "assignment_rubric_scores_submission_id_criterion_id_key" ON "assignment_rubric_scores"("submission_id", "criterion_id");
CREATE INDEX "assignment_rubric_scores_criterion_id_idx" ON "assignment_rubric_scores"("criterion_id");

ALTER TABLE "assignment_rubric_criteria" ADD CONSTRAINT "assignment_rubric_criteria_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_submissions" ADD CONSTRAINT "assignment_submissions_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignment_rubric_scores" ADD CONSTRAINT "assignment_rubric_scores_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "assignment_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_rubric_scores" ADD CONSTRAINT "assignment_rubric_scores_criterion_id_fkey" FOREIGN KEY ("criterion_id") REFERENCES "assignment_rubric_criteria"("id") ON DELETE CASCADE ON UPDATE CASCADE;
