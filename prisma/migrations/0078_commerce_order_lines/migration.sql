CREATE TYPE "CommerceProduct" AS ENUM ('OD', 'ODK');
CREATE TYPE "OrderLineFulfillmentStatus" AS ENUM ('PENDING', 'RUNNING', 'RETRY_PENDING', 'SUCCEEDED', 'MANUAL_REVIEW', 'REVOKED');
CREATE TYPE "OrderLineRefundStatus" AS ENUM ('NONE', 'PARTIAL', 'FULL');

CREATE TABLE "commerce_order_lines" (
  "id" TEXT NOT NULL,
  "od_order_id" TEXT,
  "odk_order_id" TEXT,
  "position" INTEGER NOT NULL,
  "product" "CommerceProduct" NOT NULL,
  "product_id" TEXT,
  "sku" TEXT NOT NULL,
  "product_name" TEXT NOT NULL,
  "product_snapshot" JSONB NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit_price_cents" INTEGER NOT NULL,
  "subtotal_cents" INTEGER NOT NULL,
  "discount_cents" INTEGER NOT NULL DEFAULT 0,
  "tax_cents" INTEGER NOT NULL DEFAULT 0,
  "total_cents" INTEGER NOT NULL,
  "fulfillment_owner_key" TEXT NOT NULL,
  "fulfillment_owner_snapshot" JSONB NOT NULL,
  "fulfillment_owner_user_id" TEXT,
  "fulfillment_status" "OrderLineFulfillmentStatus" NOT NULL DEFAULT 'PENDING',
  "fulfillment_attempts" INTEGER NOT NULL DEFAULT 0,
  "fulfillment_error" TEXT,
  "fulfilled_at" TIMESTAMP(3),
  "refunded_quantity" INTEGER NOT NULL DEFAULT 0,
  "refunded_cents" INTEGER NOT NULL DEFAULT 0,
  "refund_status" "OrderLineRefundStatus" NOT NULL DEFAULT 'NONE',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "commerce_order_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "commerce_order_lines_single_parent_check" CHECK (num_nonnulls("od_order_id", "odk_order_id") = 1),
  CONSTRAINT "commerce_order_lines_money_check" CHECK (
    "quantity" > 0 AND "unit_price_cents" >= 0 AND
    "subtotal_cents" = "quantity" * "unit_price_cents" AND
    "discount_cents" >= 0 AND "discount_cents" <= "subtotal_cents" AND
    "tax_cents" >= 0 AND
    "total_cents" = "subtotal_cents" - "discount_cents" + "tax_cents" AND
    "refunded_quantity" >= 0 AND "refunded_quantity" <= "quantity" AND
    "refunded_cents" >= 0 AND "refunded_cents" <= "total_cents"
  )
);

CREATE UNIQUE INDEX "commerce_order_lines_od_order_id_position_key" ON "commerce_order_lines"("od_order_id", "position");
CREATE UNIQUE INDEX "commerce_order_lines_odk_order_id_position_key" ON "commerce_order_lines"("odk_order_id", "position");
CREATE INDEX "commerce_order_lines_fulfillment_status_updated_at_idx" ON "commerce_order_lines"("fulfillment_status", "updated_at");
CREATE INDEX "commerce_order_lines_fulfillment_owner_key_product_idx" ON "commerce_order_lines"("fulfillment_owner_key", "product");

ALTER TABLE "commerce_order_lines" ADD CONSTRAINT "commerce_order_lines_od_order_id_fkey"
  FOREIGN KEY ("od_order_id") REFERENCES "od_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "commerce_order_lines" ADD CONSTRAINT "commerce_order_lines_odk_order_id_fkey"
  FOREIGN KEY ("odk_order_id") REFERENCES "odk_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "odk_entitlements" ALTER COLUMN "order_id" DROP NOT NULL;
ALTER TABLE "odk_entitlements" ADD COLUMN "order_line_id" TEXT;
CREATE UNIQUE INDEX "odk_entitlements_order_line_id_key" ON "odk_entitlements"("order_line_id");
ALTER TABLE "odk_entitlements" ADD CONSTRAINT "odk_entitlements_order_line_id_fkey"
  FOREIGN KEY ("order_line_id") REFERENCES "commerce_order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION protect_commerce_order_line_snapshot()
RETURNS trigger AS $$
BEGIN
  IF ROW(NEW."od_order_id", NEW."odk_order_id", NEW."position", NEW."product", NEW."product_id", NEW."sku",
         NEW."product_name", NEW."product_snapshot", NEW."quantity", NEW."unit_price_cents", NEW."subtotal_cents",
         NEW."discount_cents", NEW."tax_cents", NEW."total_cents", NEW."fulfillment_owner_key", NEW."fulfillment_owner_snapshot")
     IS DISTINCT FROM
     ROW(OLD."od_order_id", OLD."odk_order_id", OLD."position", OLD."product", OLD."product_id", OLD."sku",
         OLD."product_name", OLD."product_snapshot", OLD."quantity", OLD."unit_price_cents", OLD."subtotal_cents",
         OLD."discount_cents", OLD."tax_cents", OLD."total_cents", OLD."fulfillment_owner_key", OLD."fulfillment_owner_snapshot") THEN
    RAISE EXCEPTION 'commerce order-line snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "commerce_order_lines_immutable_snapshot"
BEFORE UPDATE ON "commerce_order_lines"
FOR EACH ROW EXECUTE FUNCTION protect_commerce_order_line_snapshot();

-- Historical orders intentionally remain without lines. New code falls back to
-- the legacy snapshot when reading them; backfilling would invent capture-time facts.
