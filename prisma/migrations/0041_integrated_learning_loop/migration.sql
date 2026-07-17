-- CreateEnum
CREATE TYPE "AssignmentProgressStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "lessons" ADD COLUMN "meeting_url" TEXT;

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "lesson_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "due_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_progress" (
    "id" TEXT NOT NULL,
    "assignment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "status" "AssignmentProgressStatus" NOT NULL DEFAULT 'TODO',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "assignment_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assignments_group_id_due_at_idx" ON "assignments"("group_id", "due_at");
CREATE INDEX "assignments_created_by_id_is_active_idx" ON "assignments"("created_by_id", "is_active");
CREATE UNIQUE INDEX "assignment_progress_assignment_id_student_id_key" ON "assignment_progress"("assignment_id", "student_id");
CREATE INDEX "assignment_progress_student_id_status_updated_at_idx" ON "assignment_progress"("student_id", "status", "updated_at");

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignment_progress" ADD CONSTRAINT "assignment_progress_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignment_progress" ADD CONSTRAINT "assignment_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
