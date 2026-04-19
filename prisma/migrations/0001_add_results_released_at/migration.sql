-- AlterTable: add results_released_at column that was missing from production DB
ALTER TABLE "odk_exams" ADD COLUMN IF NOT EXISTS "results_released_at" TIMESTAMP(3);
