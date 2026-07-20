CREATE TABLE "network_preferences" (
  "user_id" TEXT NOT NULL,
  "low_data_mode" BOOLEAN NOT NULL DEFAULT false,
  "offline_writes_enabled" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "network_preferences_pkey" PRIMARY KEY ("user_id")
);

ALTER TABLE "assignment_progress"
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "last_mutation_key" TEXT;

ALTER TABLE "network_preferences"
  ADD CONSTRAINT "network_preferences_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
