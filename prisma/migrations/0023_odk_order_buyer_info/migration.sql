-- AlterTable: add buyer info JSON column to OdkOrder
ALTER TABLE "odk_orders" ADD COLUMN IF NOT EXISTS "buyer_info" JSONB;
