CREATE TYPE "WeeklyDigestStatus" AS ENUM ('DRAFT', 'PUBLISHED');

ALTER TABLE "notification_preferences" ADD COLUMN "weekly_digest" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "weekly_digests" (
  "id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "week_start" TIMESTAMP(3) NOT NULL,
  "status" "WeeklyDigestStatus" NOT NULL DEFAULT 'DRAFT',
  "rule_version" TEXT NOT NULL DEFAULT 'calm-digest-v1',
  "trend_band" TEXT NOT NULL,
  "good_thing_one" TEXT NOT NULL,
  "good_thing_two" TEXT NOT NULL,
  "support_area" TEXT NOT NULL,
  "home_question" TEXT NOT NULL,
  "data_through" TIMESTAMP(3) NOT NULL,
  "generated_by_id" TEXT NOT NULL,
  "published_by_id" TEXT,
  "published_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weekly_digests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "weekly_digest_feedback" (
  "id" TEXT NOT NULL,
  "digest_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "viewer_role" "UserRole" NOT NULL,
  "helpful" BOOLEAN,
  "anxiety_pulse" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "weekly_digest_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "weekly_digests_student_id_week_start_key" ON "weekly_digests"("student_id", "week_start");
CREATE INDEX "weekly_digests_status_week_start_idx" ON "weekly_digests"("status", "week_start");
CREATE UNIQUE INDEX "weekly_digest_feedback_digest_id_user_id_key" ON "weekly_digest_feedback"("digest_id", "user_id");
CREATE INDEX "weekly_digest_feedback_viewer_role_created_at_idx" ON "weekly_digest_feedback"("viewer_role", "created_at");

ALTER TABLE "weekly_digests" ADD CONSTRAINT "weekly_digests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "weekly_digest_feedback" ADD CONSTRAINT "weekly_digest_feedback_digest_id_fkey" FOREIGN KEY ("digest_id") REFERENCES "weekly_digests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
