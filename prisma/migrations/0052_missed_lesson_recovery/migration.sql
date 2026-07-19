ALTER TYPE "WeeklyPlanTaskSource" ADD VALUE 'RECOVERY';
ALTER TYPE "WeeklyPlanReason" ADD VALUE 'MISSED_LESSON';

CREATE TYPE "RecoveryPackageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'COMPLETED');
CREATE TYPE "RecoveryItemKind" AS ENUM ('MATERIAL', 'ASSIGNMENT');
CREATE TYPE "RecoveryCheckpointResponse" AS ENUM ('NOT_YET', 'NEED_HELP', 'READY');

CREATE TABLE "recovery_packages" (
  "id" TEXT NOT NULL,
  "lesson_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "status" "RecoveryPackageStatus" NOT NULL DEFAULT 'DRAFT',
  "rule_version" TEXT NOT NULL DEFAULT 'recovery-v1',
  "summary_topic" TEXT NOT NULL,
  "summary_next_step" TEXT NOT NULL,
  "checkpoint_prompt" TEXT NOT NULL,
  "checkpoint_response" "RecoveryCheckpointResponse",
  "due_at" TIMESTAMP(3) NOT NULL,
  "generated_by_id" TEXT NOT NULL,
  "published_by_id" TEXT,
  "published_at" TIMESTAMP(3),
  "first_viewed_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "recovery_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recovery_package_items" (
  "id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "kind" "RecoveryItemKind" NOT NULL,
  "position" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "material_id" TEXT,
  "assignment_id" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "recovery_package_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recovery_packages_lesson_id_student_id_key" ON "recovery_packages"("lesson_id", "student_id");
CREATE INDEX "recovery_packages_student_id_status_due_at_idx" ON "recovery_packages"("student_id", "status", "due_at");
CREATE INDEX "recovery_packages_status_due_at_idx" ON "recovery_packages"("status", "due_at");
CREATE INDEX "recovery_package_items_package_id_position_idx" ON "recovery_package_items"("package_id", "position");
CREATE INDEX "recovery_package_items_material_id_idx" ON "recovery_package_items"("material_id");
CREATE INDEX "recovery_package_items_assignment_id_idx" ON "recovery_package_items"("assignment_id");

ALTER TABLE "recovery_packages" ADD CONSTRAINT "recovery_packages_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recovery_packages" ADD CONSTRAINT "recovery_packages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recovery_packages" ADD CONSTRAINT "recovery_packages_generated_by_id_fkey" FOREIGN KEY ("generated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recovery_packages" ADD CONSTRAINT "recovery_packages_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recovery_package_items" ADD CONSTRAINT "recovery_package_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "recovery_packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recovery_package_items" ADD CONSTRAINT "recovery_package_items_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "learning_materials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "recovery_package_items" ADD CONSTRAINT "recovery_package_items_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
