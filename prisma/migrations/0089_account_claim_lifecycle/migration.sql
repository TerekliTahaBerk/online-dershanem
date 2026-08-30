-- CreateEnum
CREATE TYPE "AccountClaimStatus" AS ENUM ('PENDING', 'CLAIMED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "AccountClaimAudience" AS ENUM ('STUDENT', 'PARENT');

-- AlterTable
ALTER TABLE "parent_students" ADD COLUMN     "confirmed_at" TIMESTAMPTZ(3),
ADD COLUMN     "confirmed_by_id" TEXT;

-- CreateTable
CREATE TABLE "account_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "audience" "AccountClaimAudience" NOT NULL,
    "status" "AccountClaimStatus" NOT NULL DEFAULT 'PENDING',
    "od_order_id" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "claimed_at" TIMESTAMPTZ(3),
    "last_reminded_at" TIMESTAMPTZ(3),
    "reminder_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "account_claims_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_claims_token_hash_key" ON "account_claims"("token_hash");

-- CreateIndex
CREATE INDEX "account_claims_user_id_status_idx" ON "account_claims"("user_id", "status");

-- CreateIndex
CREATE INDEX "account_claims_status_expires_at_idx" ON "account_claims"("status", "expires_at");

-- CreateIndex
CREATE INDEX "account_claims_od_order_id_idx" ON "account_claims"("od_order_id");

-- CreateIndex
CREATE INDEX "parent_students_confirmed_at_idx" ON "parent_students"("confirmed_at");

-- AddForeignKey
ALTER TABLE "parent_students" ADD CONSTRAINT "parent_students_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_claims" ADD CONSTRAINT "account_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_claims" ADD CONSTRAINT "account_claims_od_order_id_fkey" FOREIGN KEY ("od_order_id") REFERENCES "od_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

