CREATE TYPE "ReviewSourceType" AS ENUM ('MOCK_EXAM_SECTION', 'LESSON_OUTCOME', 'TEACHER_REFERENCE');
CREATE TYPE "ReviewItemStatus" AS ENUM ('ACTIVE', 'MASTERED', 'ARCHIVED');
CREATE TYPE "ReviewResponse" AS ENUM ('WRONG', 'UNSURE', 'CORRECT');

CREATE TABLE "review_items" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "source_type" "ReviewSourceType" NOT NULL,
  "mock_exam_section_id" TEXT,
  "lesson_id" TEXT,
  "outcome_id" TEXT,
  "created_by_id" TEXT,
  "title" TEXT NOT NULL,
  "source_reference" TEXT NOT NULL,
  "solution_note" TEXT,
  "stage" INTEGER NOT NULL DEFAULT 0,
  "due_at" TIMESTAMP(3) NOT NULL,
  "last_reviewed_at" TIMESTAMP(3),
  "last_deferred_on" TIMESTAMP(3),
  "status" "ReviewItemStatus" NOT NULL DEFAULT 'ACTIVE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "review_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "review_items_mock_exam_section_id_key" ON "review_items"("mock_exam_section_id");
CREATE UNIQUE INDEX "review_items_student_id_lesson_id_outcome_id_key" ON "review_items"("student_id", "lesson_id", "outcome_id");
CREATE INDEX "review_items_student_id_status_due_at_idx" ON "review_items"("student_id", "status", "due_at");
CREATE INDEX "review_items_created_by_id_status_idx" ON "review_items"("created_by_id", "status");

CREATE TABLE "review_attempts" (
  "id" TEXT NOT NULL,
  "review_item_id" TEXT NOT NULL,
  "response" "ReviewResponse" NOT NULL,
  "stage_before" INTEGER NOT NULL,
  "stage_after" INTEGER NOT NULL,
  "next_due_at" TIMESTAMP(3),
  "idempotency_key" TEXT NOT NULL,
  "reviewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "review_attempts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "review_attempts_review_item_id_idempotency_key_key" ON "review_attempts"("review_item_id", "idempotency_key");
CREATE INDEX "review_attempts_reviewed_at_response_idx" ON "review_attempts"("reviewed_at", "response");

ALTER TABLE "review_items" ADD CONSTRAINT "review_items_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_mock_exam_section_id_fkey" FOREIGN KEY ("mock_exam_section_id") REFERENCES "mock_exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_outcome_id_fkey" FOREIGN KEY ("outcome_id") REFERENCES "learning_outcomes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "review_items" ADD CONSTRAINT "review_items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "review_attempts" ADD CONSTRAINT "review_attempts_review_item_id_fkey" FOREIGN KEY ("review_item_id") REFERENCES "review_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
