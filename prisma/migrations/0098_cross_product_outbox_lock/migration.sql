-- AlterTable
ALTER TABLE "cross_product_event_outbox" ADD COLUMN     "locked_at" TIMESTAMPTZ(3);

-- CreateIndex
CREATE INDEX "cross_product_event_outbox_status_locked_at_idx" ON "cross_product_event_outbox"("status", "locked_at");

