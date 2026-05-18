-- CreateTable
CREATE TABLE "od_orders" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "package_id" TEXT,
    "package_name" TEXT NOT NULL,
    "category" TEXT,
    "subject" TEXT,
    "status" "OdkOrderStatus" NOT NULL DEFAULT 'PENDING',
    "subtotal_cents" INTEGER NOT NULL,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "buyer_info" JSONB,
    "intent_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "od_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "od_payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "provider" "OdkPaymentProvider" NOT NULL DEFAULT 'PAYTR',
    "provider_ref" TEXT,
    "status" "OdkPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount_cents" INTEGER NOT NULL,
    "paid_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "od_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "od_orders_user_id_status_idx" ON "od_orders"("user_id", "status");
CREATE INDEX "od_orders_status_created_at_idx" ON "od_orders"("status", "created_at");
CREATE INDEX "od_orders_intent_id_idx" ON "od_orders"("intent_id");
CREATE INDEX "od_payments_order_id_idx" ON "od_payments"("order_id");
CREATE INDEX "od_payments_status_created_at_idx" ON "od_payments"("status", "created_at");

-- AddForeignKey
ALTER TABLE "od_orders" ADD CONSTRAINT "od_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "od_orders" ADD CONSTRAINT "od_orders_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "Package"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "od_payments" ADD CONSTRAINT "od_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "od_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
