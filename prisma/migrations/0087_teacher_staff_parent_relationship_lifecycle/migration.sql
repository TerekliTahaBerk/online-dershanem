-- Part 22–23 — teacher/staff lifecycle + parent relationship history

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ParentRelationshipAction') THEN
    CREATE TYPE "ParentRelationshipAction" AS ENUM ('LINKED', 'UPDATED', 'UNLINKED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "parent_student_history" (
  "id" TEXT NOT NULL,
  "parent_student_id" TEXT,
  "parent_id" TEXT NOT NULL,
  "student_id" TEXT NOT NULL,
  "action" "ParentRelationshipAction" NOT NULL,
  "relationship" TEXT,
  "previous_value" TEXT,
  "actor_user_id" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "parent_student_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "parent_student_history_parent_id_created_at_idx"
  ON "parent_student_history" ("parent_id", "created_at");

CREATE INDEX IF NOT EXISTS "parent_student_history_student_id_created_at_idx"
  ON "parent_student_history" ("student_id", "created_at");

CREATE INDEX IF NOT EXISTS "parent_student_history_actor_user_id_created_at_idx"
  ON "parent_student_history" ("actor_user_id", "created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_student_history_parent_student_id_fkey'
  ) THEN
    ALTER TABLE "parent_student_history"
      ADD CONSTRAINT "parent_student_history_parent_student_id_fkey"
      FOREIGN KEY ("parent_student_id") REFERENCES "parent_students"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_student_history_parent_id_fkey'
  ) THEN
    ALTER TABLE "parent_student_history"
      ADD CONSTRAINT "parent_student_history_parent_id_fkey"
      FOREIGN KEY ("parent_id") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_student_history_student_id_fkey'
  ) THEN
    ALTER TABLE "parent_student_history"
      ADD CONSTRAINT "parent_student_history_student_id_fkey"
      FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parent_student_history_actor_user_id_fkey'
  ) THEN
    ALTER TABLE "parent_student_history"
      ADD CONSTRAINT "parent_student_history_actor_user_id_fkey"
      FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
