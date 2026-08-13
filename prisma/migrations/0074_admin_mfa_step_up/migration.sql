CREATE TYPE "MfaChallengePurpose" AS ENUM ('PASSKEY_ENROLLMENT', 'MFA_AUTHENTICATION', 'STEP_UP');
CREATE TYPE "MfaResetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'EXPIRED');

ALTER TABLE "sessions"
  ADD COLUMN "primary_authenticated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "mfa_verified_at" TIMESTAMP(3),
  ADD COLUMN "step_up_at" TIMESTAMP(3);

CREATE TABLE "admin_mfa" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "totp_secret_encrypted" TEXT,
  "totp_enabled_at" TIMESTAMP(3),
  "totp_last_counter" BIGINT,
  "pending_totp_secret_encrypted" TEXT,
  "pending_totp_expires_at" TIMESTAMP(3),
  "recovery_generated_at" TIMESTAMP(3),
  "enrolled_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "admin_mfa_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "passkey_credentials" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "credential_id" TEXT NOT NULL,
  "public_key" BYTEA NOT NULL,
  "counter" BIGINT NOT NULL DEFAULT 0,
  "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "device_type" TEXT NOT NULL,
  "backed_up" BOOLEAN NOT NULL DEFAULT false,
  "name" TEXT,
  "last_used_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mfa_recovery_codes" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "code_hash" TEXT NOT NULL,
  "used_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mfa_challenges" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "session_id" TEXT NOT NULL,
  "purpose" "MfaChallengePurpose" NOT NULL,
  "challenge_hash" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "mfa_reset_requests" (
  "id" TEXT NOT NULL,
  "target_user_id" TEXT NOT NULL,
  "requested_by_id" TEXT NOT NULL,
  "approved_by_id" TEXT,
  "status" "MfaResetStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "approved_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_reset_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_mfa_user_id_key" ON "admin_mfa"("user_id");
CREATE UNIQUE INDEX "passkey_credentials_credential_id_key" ON "passkey_credentials"("credential_id");
CREATE INDEX "passkey_credentials_user_id_revoked_at_idx" ON "passkey_credentials"("user_id", "revoked_at");
CREATE UNIQUE INDEX "mfa_recovery_codes_code_hash_key" ON "mfa_recovery_codes"("code_hash");
CREATE INDEX "mfa_recovery_codes_user_id_used_at_idx" ON "mfa_recovery_codes"("user_id", "used_at");
CREATE INDEX "mfa_challenges_user_id_session_id_purpose_expires_at_idx" ON "mfa_challenges"("user_id", "session_id", "purpose", "expires_at");
CREATE INDEX "mfa_reset_requests_target_user_id_status_idx" ON "mfa_reset_requests"("target_user_id", "status");
CREATE INDEX "mfa_reset_requests_status_expires_at_idx" ON "mfa_reset_requests"("status", "expires_at");

ALTER TABLE "admin_mfa" ADD CONSTRAINT "admin_mfa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_challenges" ADD CONSTRAINT "mfa_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_reset_requests" ADD CONSTRAINT "mfa_reset_requests_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mfa_reset_requests" ADD CONSTRAINT "mfa_reset_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mfa_reset_requests" ADD CONSTRAINT "mfa_reset_requests_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
