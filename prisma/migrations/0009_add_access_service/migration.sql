-- AlterEnum / CreateEnum
DO $$ BEGIN
  CREATE TYPE "AccessService" AS ENUM ('OD', 'ODK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: add service column with default 'ODK' so existing rows keep semantic meaning
ALTER TABLE "odk_access_tags"
  ADD COLUMN IF NOT EXISTS "service" "AccessService" NOT NULL DEFAULT 'ODK';

-- Index for service-based filtering
CREATE INDEX IF NOT EXISTS "odk_access_tags_service_is_active_idx"
  ON "odk_access_tags"("service", "is_active");
