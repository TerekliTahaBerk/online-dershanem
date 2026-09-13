-- Part 20 — Account lifecycle + invitation baseline

ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "invite_token_hash" TEXT,
  ADD COLUMN IF NOT EXISTS "invite_token_expires_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "invite_sent_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "invite_accepted_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "password_changed_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMPTZ(3),
  ADD COLUMN IF NOT EXISTS "archived_by_id" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "users_invite_token_hash_key" ON "users" ("invite_token_hash");
CREATE INDEX IF NOT EXISTS "users_archived_by_id_idx" ON "users" ("archived_by_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_archived_by_id_fkey') THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_archived_by_id_fkey"
      FOREIGN KEY ("archived_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Existing users should keep signing in after rollout; invitation is enforced
-- only for newly created/invite-reset accounts from this phase onward.
UPDATE "users"
SET "invite_accepted_at" = COALESCE("invite_accepted_at", "password_changed_at", "last_login_at", "created_at")
WHERE "invite_accepted_at" IS NULL;

-- Legacy drift cleanup from old onboarding attempt.
ALTER TABLE "users"
  DROP COLUMN IF EXISTS "userInviteToken",
  DROP COLUMN IF EXISTS "userInviteTokenExpiresAt",
  DROP COLUMN IF EXISTS "userInviteSentAt",
  DROP COLUMN IF EXISTS "accountDisabledAt";

DROP INDEX IF EXISTS "User_userInviteToken_key";
