-- M5 — Mobil push bildirimi: cihaz kaydı ve kalıcı teslim kuyruğu.
--
-- YALNIZ EKLEMELİ: yeni enum / tablo / sütun / indeks. Mevcut veri
-- değişmez, bildirim silinmez.
--  * notification_preferences.push_enabled varsayılan FALSE: göç mevcut
--    kullanıcıları push'a DAHİL ETMEZ (açık onay gerekir).
--  * notification_preferences.exam_updates varsayılan TRUE: yalnız Deneme
--    Ligi kategorisinin uygulama içi tercih anahtarı (diğer kategorilerle aynı).
--  * push_devices.expo_push_token benzersiz: bir token aynı anda tek kullanıcıya.
--  * push_deliveries (notification_id, device_id) benzersiz: tek mantıksal teslim.
-- Geri alma: tabloların ve iki sütunun düşürülmesi yeterlidir; diğer tablolara
-- bağımlılık yoktur (bkz. docs/mobile/m5-rollout-runbook.md).


-- CreateEnum
CREATE TYPE "PushPlatform" AS ENUM ('IOS', 'ANDROID');

-- CreateEnum
CREATE TYPE "PushDeliveryState" AS ENUM ('PENDING', 'CLAIMED', 'ACCEPTED', 'PROVIDER_ACCEPTED', 'RETRY', 'FAILED', 'CANCELED');

-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "exam_updates" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "push_enabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "push_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "platform" "PushPlatform" NOT NULL,
    "app_version" TEXT NOT NULL,
    "project_id" TEXT,
    "app_environment" TEXT,
    "permission_status" TEXT,
    "activated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(3),
    "revoked_reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "push_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_deliveries" (
    "id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "state" "PushDeliveryState" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "claim_token" TEXT,
    "lease_expires_at" TIMESTAMPTZ(3),
    "next_attempt_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(3),
    "ticket_id" TEXT,
    "receipt_status" TEXT,
    "receipt_checked_at" TIMESTAMPTZ(3),
    "last_error_code" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "push_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_devices_expo_push_token_key" ON "push_devices"("expo_push_token");

-- CreateIndex
CREATE INDEX "push_devices_user_id_revoked_at_idx" ON "push_devices"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "push_devices_session_id_idx" ON "push_devices"("session_id");

-- CreateIndex
CREATE INDEX "push_devices_revoked_at_last_seen_at_idx" ON "push_devices"("revoked_at", "last_seen_at");

-- CreateIndex
CREATE INDEX "push_deliveries_state_next_attempt_at_idx" ON "push_deliveries"("state", "next_attempt_at");

-- CreateIndex
CREATE INDEX "push_deliveries_state_submitted_at_idx" ON "push_deliveries"("state", "submitted_at");

-- CreateIndex
CREATE INDEX "push_deliveries_created_at_idx" ON "push_deliveries"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_deliveries_notification_id_device_id_key" ON "push_deliveries"("notification_id", "device_id");

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_devices" ADD CONSTRAINT "push_devices_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_notification_id_fkey" FOREIGN KEY ("notification_id") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_deliveries" ADD CONSTRAINT "push_deliveries_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "push_devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

