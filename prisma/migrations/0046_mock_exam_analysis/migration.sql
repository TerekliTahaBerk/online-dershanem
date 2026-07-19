CREATE TYPE "MockExamErrorCategory" AS ENUM ('KNOWLEDGE', 'PROCESS', 'ATTENTION', 'TIME', 'BLANK');

CREATE TABLE "mock_exams" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "exam" "CurriculumExam" NOT NULL,
  "title" TEXT,
  "publisher" TEXT,
  "taken_at" TIMESTAMP(3) NOT NULL,
  "duration_minutes" INTEGER,
  "next_action" TEXT,
  "next_action_approved_at" TIMESTAMP(3),
  "created_by_id" TEXT NOT NULL,
  "reviewed_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mock_exams_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "mock_exams_student_id_taken_at_idx" ON "mock_exams"("student_id", "taken_at");
CREATE INDEX "mock_exams_exam_taken_at_idx" ON "mock_exams"("exam", "taken_at");

CREATE TABLE "mock_exam_sections" (
  "id" TEXT NOT NULL,
  "mock_exam_id" TEXT NOT NULL,
  "subject_code" TEXT NOT NULL,
  "subject_name" TEXT NOT NULL,
  "question_count" INTEGER NOT NULL,
  "correct_count" INTEGER NOT NULL,
  "incorrect_count" INTEGER NOT NULL,
  "blank_count" INTEGER NOT NULL,
  "duration_minutes" INTEGER,
  "position" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "mock_exam_sections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mock_exam_sections_mock_exam_id_subject_code_key" ON "mock_exam_sections"("mock_exam_id", "subject_code");
CREATE INDEX "mock_exam_sections_mock_exam_id_position_idx" ON "mock_exam_sections"("mock_exam_id", "position");

CREATE TABLE "mock_exam_section_errors" (
  "section_id" TEXT NOT NULL,
  "category" "MockExamErrorCategory" NOT NULL,
  "revised_by_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mock_exam_section_errors_pkey" PRIMARY KEY ("section_id", "category")
);
CREATE INDEX "mock_exam_section_errors_category_updated_at_idx" ON "mock_exam_section_errors"("category", "updated_at");

ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "mock_exam_sections" ADD CONSTRAINT "mock_exam_sections_mock_exam_id_fkey" FOREIGN KEY ("mock_exam_id") REFERENCES "mock_exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_exam_section_errors" ADD CONSTRAINT "mock_exam_section_errors_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "mock_exam_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mock_exam_section_errors" ADD CONSTRAINT "mock_exam_section_errors_revised_by_id_fkey" FOREIGN KEY ("revised_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
