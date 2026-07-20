CREATE TYPE "AccessibilityTextScale" AS ENUM ('DEFAULT', 'LARGE');

CREATE TABLE "accessibility_preferences" (
  "user_id" TEXT NOT NULL,
  "reduced_motion" BOOLEAN NOT NULL DEFAULT false,
  "high_contrast" BOOLEAN NOT NULL DEFAULT false,
  "text_scale" "AccessibilityTextScale" NOT NULL DEFAULT 'DEFAULT',
  "comfortable_spacing" BOOLEAN NOT NULL DEFAULT false,
  "captions_preferred" BOOLEAN NOT NULL DEFAULT false,
  "transcript_preferred" BOOLEAN NOT NULL DEFAULT false,
  "assessment_extra_percent" INTEGER NOT NULL DEFAULT 0,
  "breaks_allowed" BOOLEAN NOT NULL DEFAULT false,
  "academic_updated_by_id" TEXT,
  "academic_updated_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "accessibility_preferences_pkey" PRIMARY KEY ("user_id"),
  CONSTRAINT "accessibility_preferences_extra_time_check" CHECK ("assessment_extra_percent" IN (0, 25, 50, 100))
);

ALTER TABLE "learning_materials" ADD COLUMN "captions_available" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "learning_materials" ADD COLUMN "transcript" TEXT;

CREATE INDEX "accessibility_preferences_academic_updated_by_id_academic_updated_at_idx" ON "accessibility_preferences"("academic_updated_by_id", "academic_updated_at");
ALTER TABLE "accessibility_preferences" ADD CONSTRAINT "accessibility_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accessibility_preferences" ADD CONSTRAINT "accessibility_preferences_academic_updated_by_id_fkey" FOREIGN KEY ("academic_updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
