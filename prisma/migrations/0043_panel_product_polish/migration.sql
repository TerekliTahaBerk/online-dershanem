ALTER TABLE "student_profiles"
  ADD COLUMN "weekly_goal" TEXT,
  ADD COLUMN "weekly_goal_updated_at" TIMESTAMP(3);

ALTER TABLE "learning_materials"
  ADD COLUMN "blob_pathname" TEXT,
  ADD COLUMN "file_name" TEXT,
  ADD COLUMN "mime_type" TEXT,
  ADD COLUMN "file_size" INTEGER;

CREATE TABLE "teacher_note_templates" (
  "id" TEXT NOT NULL,
  "teacher_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "note" TEXT,
  "next_goal" TEXT,
  "homework" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "teacher_note_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "teacher_note_templates_teacher_id_updated_at_idx"
  ON "teacher_note_templates"("teacher_id", "updated_at");

ALTER TABLE "teacher_note_templates"
  ADD CONSTRAINT "teacher_note_templates_teacher_id_fkey"
  FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
