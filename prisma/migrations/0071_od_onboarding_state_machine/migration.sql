CREATE TYPE "OdOnboardingState" AS ENUM (
  'PAID',
  'CONTACT_PENDING',
  'CONTACTED',
  'ACCOUNT_READY',
  'PARENT_LINKED',
  'PLACEMENT_PENDING',
  'GROUP_ASSIGNED',
  'FIRST_LESSON_SCHEDULED',
  'ACTIVE',
  'BLOCKED',
  'REFUND_PENDING',
  'CANCELED'
);

CREATE TYPE "OdOnboardingFlowType" AS ENUM ('NEW_STUDENT', 'EXISTING_STUDENT');

CREATE TABLE "od_onboardings" (
  "id" TEXT NOT NULL,
  "order_id" TEXT NOT NULL,
  "state" "OdOnboardingState" NOT NULL DEFAULT 'PAID',
  "flow_type" "OdOnboardingFlowType" NOT NULL DEFAULT 'NEW_STUDENT',
  "owner_id" TEXT,
  "due_at" TIMESTAMP(3),
  "blocker_reason" TEXT,
  "blocked_from_state" "OdOnboardingState",
  "state_entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activated_at" TIMESTAMP(3),
  "canceled_at" TIMESTAMP(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "od_onboardings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "od_onboarding_transitions" (
  "id" TEXT NOT NULL,
  "onboarding_id" TEXT NOT NULL,
  "from_state" "OdOnboardingState",
  "to_state" "OdOnboardingState" NOT NULL,
  "actor_user_id" TEXT,
  "actor_type" "AuditActorType" NOT NULL DEFAULT 'SYSTEM',
  "note" TEXT,
  "metadata" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "od_onboarding_transitions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "od_onboardings_order_id_key" ON "od_onboardings"("order_id");
CREATE INDEX "od_onboardings_state_due_at_idx" ON "od_onboardings"("state", "due_at");
CREATE INDEX "od_onboardings_owner_id_state_due_at_idx" ON "od_onboardings"("owner_id", "state", "due_at");
CREATE INDEX "od_onboarding_transitions_onboarding_id_occurred_at_idx" ON "od_onboarding_transitions"("onboarding_id", "occurred_at");
CREATE INDEX "od_onboarding_transitions_actor_user_id_occurred_at_idx" ON "od_onboarding_transitions"("actor_user_id", "occurred_at");

ALTER TABLE "od_onboardings" ADD CONSTRAINT "od_onboardings_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "od_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "od_onboardings" ADD CONSTRAINT "od_onboardings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "od_onboarding_transitions" ADD CONSTRAINT "od_onboarding_transitions_onboarding_id_fkey" FOREIGN KEY ("onboarding_id") REFERENCES "od_onboardings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "od_onboarding_transitions" ADD CONSTRAINT "od_onboarding_transitions_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "od_onboardings" (
  "id", "order_id", "state", "flow_type", "due_at", "state_entered_at", "created_at", "updated_at"
)
SELECT
  'odonb_' || md5(o."id"),
  o."id",
  'PAID'::"OdOnboardingState",
  CASE WHEN o."user_id" IS NULL THEN 'NEW_STUDENT'::"OdOnboardingFlowType" ELSE 'EXISTING_STUDENT'::"OdOnboardingFlowType" END,
  CURRENT_TIMESTAMP + INTERVAL '4 hours',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "od_orders" o
WHERE o."status" = 'PAID'
ON CONFLICT ("order_id") DO NOTHING;

INSERT INTO "od_onboarding_transitions" (
  "id", "onboarding_id", "from_state", "to_state", "actor_type", "note", "occurred_at"
)
SELECT
  'odonbt_' || md5(ob."id"),
  ob."id",
  NULL,
  'PAID'::"OdOnboardingState",
  'SYSTEM'::"AuditActorType",
  'Migration sırasında mevcut PAID sipariş için oluşturuldu.',
  ob."created_at"
FROM "od_onboardings" ob
WHERE NOT EXISTS (
  SELECT 1 FROM "od_onboarding_transitions" t WHERE t."onboarding_id" = ob."id"
);

CREATE OR REPLACE FUNCTION sync_od_onboarding_terminal_status()
RETURNS TRIGGER AS $$
DECLARE
  onboarding_id TEXT;
  previous_state "OdOnboardingState";
  event_time TIMESTAMP(3) := CURRENT_TIMESTAMP;
BEGIN
  IF NEW."status" NOT IN ('REFUNDED', 'CANCELLED') OR NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;

  SELECT "id", "state" INTO onboarding_id, previous_state
  FROM "od_onboardings"
  WHERE "order_id" = NEW."id"
  FOR UPDATE;

  IF onboarding_id IS NOT NULL AND previous_state <> 'CANCELED' THEN
    UPDATE "od_onboardings"
    SET "state" = 'CANCELED',
        "due_at" = NULL,
        "blocker_reason" = NULL,
        "blocked_from_state" = NULL,
        "state_entered_at" = event_time,
        "canceled_at" = event_time,
        "version" = "version" + 1,
        "updated_at" = event_time
    WHERE "id" = onboarding_id;

    INSERT INTO "od_onboarding_transitions" (
      "id", "onboarding_id", "from_state", "to_state", "actor_type", "note", "occurred_at"
    ) VALUES (
      'odonbt_' || md5(random()::TEXT || clock_timestamp()::TEXT),
      onboarding_id,
      previous_state,
      'CANCELED',
      'SYSTEM',
      'Sipariş ödeme durumu ' || NEW."status" || ' olduğu için otomatik kapatıldı.',
      event_time
    );

    INSERT INTO "AuditLog" (
      "id", "actorUserId", "actorType", "entityType", "entityId", "action", "summary", "payload", "createdAt"
    ) VALUES (
      'audit_' || md5(random()::TEXT || clock_timestamp()::TEXT),
      NULL,
      'SYSTEM',
      'OdOnboarding',
      onboarding_id,
      'onboarding.payment_terminal_sync',
      previous_state::TEXT || ' → CANCELED',
      jsonb_build_object('orderId', NEW."id", 'orderStatus', NEW."status"),
      event_time
    );
  END IF;

  IF NEW."user_id" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "od_orders" other
    WHERE other."user_id" = NEW."user_id" AND other."id" <> NEW."id" AND other."status" = 'PAID'
  ) THEN
    UPDATE "product_memberships"
    SET "revoked_at" = COALESCE("revoked_at", event_time), "updated_at" = event_time
    WHERE "user_id" = NEW."user_id" AND "product" = 'OD' AND "source" = 'PURCHASE' AND "revoked_at" IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "od_order_terminal_onboarding_sync"
AFTER UPDATE OF "status" ON "od_orders"
FOR EACH ROW EXECUTE FUNCTION sync_od_onboarding_terminal_status();

CREATE OR REPLACE FUNCTION sync_od_refunded_payment_to_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."status" = 'REFUNDED' AND OLD."status" <> 'REFUNDED' THEN
    UPDATE "od_orders" SET "status" = 'REFUNDED', "updated_at" = CURRENT_TIMESTAMP WHERE "id" = NEW."order_id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "od_payment_refund_order_sync"
AFTER UPDATE OF "status" ON "od_payments"
FOR EACH ROW EXECUTE FUNCTION sync_od_refunded_payment_to_order();
