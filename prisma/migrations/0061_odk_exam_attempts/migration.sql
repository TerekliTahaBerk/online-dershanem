CREATE TYPE "OdkAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'VOID');

CREATE TABLE "odk_exam_attempts" (
  "id" TEXT NOT NULL,
  "exam_id" TEXT NOT NULL,
  "version_id" TEXT NOT NULL,
  "student_user_id" TEXT NOT NULL,
  "attempt_number" INTEGER NOT NULL DEFAULT 1,
  "status" "OdkAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "meet_acknowledged_at" TIMESTAMP(3),
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deadline_at" TIMESTAMP(3) NOT NULL,
  "submitted_at" TIMESTAMP(3),
  "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_exam_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "odk_exam_attempts_attempt_number_check" CHECK ("attempt_number" > 0),
  CONSTRAINT "odk_exam_attempts_deadline_check" CHECK ("deadline_at" >= "started_at")
);

CREATE UNIQUE INDEX "odk_exam_attempts_exam_id_student_user_id_attempt_number_key"
  ON "odk_exam_attempts"("exam_id", "student_user_id", "attempt_number");
CREATE INDEX "odk_exam_attempts_student_user_id_status_deadline_at_idx"
  ON "odk_exam_attempts"("student_user_id", "status", "deadline_at");
CREATE INDEX "odk_exam_attempts_exam_id_status_started_at_idx"
  ON "odk_exam_attempts"("exam_id", "status", "started_at");

CREATE TABLE "odk_attempt_answers" (
  "attempt_id" TEXT NOT NULL,
  "question_id" TEXT NOT NULL,
  "selected_option" "OdkAnswerOption",
  "is_marked" BOOLEAN NOT NULL DEFAULT false,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "answered_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_attempt_answers_pkey" PRIMARY KEY ("attempt_id", "question_id"),
  CONSTRAINT "odk_attempt_answers_revision_check" CHECK ("revision" > 0)
);

CREATE INDEX "odk_attempt_answers_question_id_idx" ON "odk_attempt_answers"("question_id");

ALTER TABLE "odk_exam_attempts" ADD CONSTRAINT "odk_exam_attempts_exam_id_fkey"
  FOREIGN KEY ("exam_id") REFERENCES "odk_exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exam_attempts" ADD CONSTRAINT "odk_exam_attempts_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "odk_exam_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exam_attempts" ADD CONSTRAINT "odk_exam_attempts_student_user_id_fkey"
  FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_answers" ADD CONSTRAINT "odk_attempt_answers_attempt_id_fkey"
  FOREIGN KEY ("attempt_id") REFERENCES "odk_exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_attempt_answers" ADD CONSTRAINT "odk_attempt_answers_question_id_fkey"
  FOREIGN KEY ("question_id") REFERENCES "odk_exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
