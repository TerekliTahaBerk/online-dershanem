ALTER TABLE "intervention_cases" ALTER COLUMN "rule_version" SET DEFAULT 'intervention-v2';

CREATE TABLE "intervention_case_signals" (
  "id" TEXT NOT NULL,
  "case_id" TEXT NOT NULL,
  "reason_code" "InterventionReason" NOT NULL,
  "explanation" TEXT NOT NULL,
  "suggested_action" TEXT NOT NULL,
  "evidence_count" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "intervention_case_signals_pkey" PRIMARY KEY ("id")
);

INSERT INTO "intervention_case_signals" (
  "id",
  "case_id",
  "reason_code",
  "explanation",
  "suggested_action",
  "evidence_count",
  "created_at"
)
SELECT
  'legacy_' || md5("id" || ':' || "reason_code"::text),
  "id",
  "reason_code",
  "explanation",
  "suggested_action",
  "evidence_count",
  "created_at"
FROM "intervention_cases";

CREATE UNIQUE INDEX "intervention_case_signals_case_id_reason_code_key" ON "intervention_case_signals"("case_id", "reason_code");
CREATE INDEX "intervention_case_signals_case_id_reason_code_idx" ON "intervention_case_signals"("case_id", "reason_code");

ALTER TABLE "intervention_case_signals"
ADD CONSTRAINT "intervention_case_signals_case_id_fkey"
FOREIGN KEY ("case_id") REFERENCES "intervention_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
