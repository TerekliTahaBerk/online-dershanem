CREATE TABLE "product_events" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "properties" JSONB NOT NULL,
  "schema_version" INTEGER NOT NULL DEFAULT 1,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "product_events_name_occurred_at_idx"
  ON "product_events"("name", "occurred_at");

CREATE INDEX "product_events_role_occurred_at_idx"
  ON "product_events"("role", "occurred_at");
