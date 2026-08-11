CREATE TYPE "OdProvisioningStatus" AS ENUM ('PENDING', 'RUNNING', 'RETRY_PENDING', 'SUCCEEDED', 'MANUAL_REVIEW');

ALTER TYPE "OdOnboardingState" ADD VALUE IF NOT EXISTS 'MANUAL_REVIEW' BEFORE 'BLOCKED';

ALTER TABLE "od_orders"
  ADD COLUMN "provisioning_status" "OdProvisioningStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "provisioning_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "provisioning_error" TEXT,
  ADD COLUMN "provisioned_at" TIMESTAMP(3);

ALTER TABLE "product_memberships" ADD COLUMN "source_od_order_id" TEXT;

CREATE INDEX "od_orders_provisioning_status_updated_at_idx" ON "od_orders"("provisioning_status", "updated_at");
CREATE INDEX "product_memberships_source_od_order_id_idx" ON "product_memberships"("source_od_order_id");

ALTER TABLE "product_memberships" ADD CONSTRAINT "product_memberships_source_od_order_id_fkey"
  FOREIGN KEY ("source_od_order_id") REFERENCES "od_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "product_memberships" (
  "id", "user_id", "product", "source", "source_od_order_id", "starts_at", "created_at", "updated_at"
)
SELECT
  'odpm_' || md5(o."id"), o."user_id", 'OD'::"ProductCode", 'PURCHASE'::"ProductAccessSource", o."id", o."updated_at", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "od_orders" o
WHERE o."status" = 'PAID' AND o."user_id" IS NOT NULL
ON CONFLICT ("user_id", "product") DO UPDATE
SET "source" = 'PURCHASE',
    "source_od_order_id" = EXCLUDED."source_od_order_id",
    "revoked_at" = NULL,
    "expires_at" = NULL,
    "updated_at" = CURRENT_TIMESTAMP;

UPDATE "od_orders"
SET "provisioning_status" = 'SUCCEEDED', "provisioned_at" = "updated_at"
WHERE "status" = 'PAID' AND "user_id" IS NOT NULL;

UPDATE "od_orders"
SET "provisioning_status" = 'RETRY_PENDING'
WHERE "status" = 'PAID' AND "user_id" IS NULL;
