CREATE TABLE "odk_pilot_runs" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "PilotCohortStatus" NOT NULL DEFAULT 'DRAFT',
  "created_by_id" TEXT NOT NULL,
  "request_key" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "started_at" TIMESTAMP(3),
  "stopped_at" TIMESTAMP(3),
  "stop_reason" "PilotStopReason",
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_pilot_runs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "odk_pilot_members" (
  "run_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "odk_pilot_members_pkey" PRIMARY KEY ("run_id", "user_id")
);

CREATE UNIQUE INDEX "odk_pilot_runs_request_key_key" ON "odk_pilot_runs"("request_key");
CREATE INDEX "odk_pilot_runs_status_created_at_idx" ON "odk_pilot_runs"("status", "created_at");
CREATE INDEX "odk_pilot_members_user_id_role_idx" ON "odk_pilot_members"("user_id", "role");

ALTER TABLE "odk_pilot_runs" ADD CONSTRAINT "odk_pilot_runs_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_pilot_members" ADD CONSTRAINT "odk_pilot_members_run_id_fkey"
  FOREIGN KEY ("run_id") REFERENCES "odk_pilot_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_pilot_members" ADD CONSTRAINT "odk_pilot_members_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
