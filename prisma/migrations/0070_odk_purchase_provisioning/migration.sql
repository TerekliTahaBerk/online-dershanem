CREATE TYPE "OdkProvisioningStatus" AS ENUM ('PENDING', 'RUNNING', 'RETRY_PENDING', 'SUCCEEDED');

ALTER TABLE "odk_orders"
  ADD COLUMN "student_user_id" TEXT,
  ADD COLUMN "provisioning_status" "OdkProvisioningStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "provisioning_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "provisioning_error" TEXT,
  ADD COLUMN "provisioned_at" TIMESTAMP(3);

CREATE TABLE "odk_entitlements" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "package_id" TEXT NOT NULL,
  "starts_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "odk_entitlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "odk_entitlements_order_id_key" ON "odk_entitlements"("order_id");
CREATE INDEX "odk_entitlements_user_id_revoked_at_expires_at_idx" ON "odk_entitlements"("user_id", "revoked_at", "expires_at");
CREATE INDEX "odk_entitlements_package_id_idx" ON "odk_entitlements"("package_id");
CREATE INDEX "odk_orders_provisioning_status_updated_at_idx" ON "odk_orders"("provisioning_status", "updated_at");
CREATE INDEX "odk_orders_student_user_id_created_at_idx" ON "odk_orders"("student_user_id", "created_at");

ALTER TABLE "odk_orders" ADD CONSTRAINT "odk_orders_student_user_id_fkey" FOREIGN KEY ("student_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "odk_entitlements" ADD CONSTRAINT "odk_entitlements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "odk_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_entitlements" ADD CONSTRAINT "odk_entitlements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "odk_entitlements" ADD CONSTRAINT "odk_entitlements_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "odk_packages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
