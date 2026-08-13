ALTER TABLE "odk_packages"
  ADD COLUMN "contract_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "contract_policy" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "odk_orders"
  ADD COLUMN "contract_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE "odk_entitlements"
  ADD COLUMN "contract_snapshot" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Existing packages get an explicit conservative contract. Catalog operators can
-- open sales only by changing sales.state after reviewing the remaining policy.
UPDATE "odk_packages"
SET "contract_policy" = jsonb_build_object(
  'sales', jsonb_build_object('state', CASE WHEN "is_active" THEN 'PAUSED' ELSE 'CLOSED' END),
  'access', jsonb_build_object('starts', 'PURCHASED_AT', 'durationDays', "duration_days"),
  'rights', jsonb_build_object(
    'studentReports', true,
    'parentReports', true,
    'teacherReports', true,
    'liveService', true
  ),
  'exceptions', jsonb_build_object(
    'soldOut', 'BLOCK_NEW_ORDERS',
    'outage', 'RESCHEDULE_OR_EXTEND_ACCESS',
    'cancellation', 'RESCHEDULE_OR_REFUND',
    'refund', 'BEFORE_FIRST_ATTEMPT',
    'exceptionalAccess', 'ADMIN_GRANT_WITH_REASON_AND_EXPIRY'
  )
)
WHERE "contract_policy" = '{}'::jsonb;

-- Preserve a best-effort snapshot for historical orders created before this
-- migration. The application creates richer snapshots for all new orders.
UPDATE "odk_orders" AS o
SET "contract_snapshot" = jsonb_build_object(
  'schemaVersion', 1,
  'catalogVersion', p."contract_version",
  'capturedAt', o."created_at",
  'package', jsonb_build_object(
    'id', p."id", 'slug', p."slug", 'title', p."title",
    'description', p."description", 'priceCents', p."price_cents",
    'originalPriceCents', p."original_price_cents"
  ),
  'policy', p."contract_policy",
  'exams', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'id', e."id", 'seriesId', e."series_id", 'title', e."title",
      'slug', e."slug", 'family', e."family",
      'startsAt', e."starts_at", 'endsAt', e."ends_at",
      'lateEntryMinutes', e."late_entry_minutes",
      'attemptLimit', e."attempt_limit",
      'resultsReleasedAt', e."results_released_at",
      'answerKeyReleasedAt', e."answer_key_released_at",
      'liveServiceRequired', e."meet_required"
    ) ORDER BY pe."sort_order", e."starts_at", e."id")
    FROM "odk_package_exams" pe
    JOIN "odk_exams" e ON e."id" = pe."exam_id"
    WHERE pe."package_id" = p."id"
  ), '[]'::jsonb)
)
FROM "odk_packages" p
WHERE p."id" = o."package_id" AND o."contract_snapshot" = '{}'::jsonb;

UPDATE "odk_entitlements" AS e
SET "contract_snapshot" = o."contract_snapshot"
FROM "odk_orders" o
WHERE o."id" = e."order_id" AND e."contract_snapshot" = '{}'::jsonb;

CREATE OR REPLACE FUNCTION prevent_odk_contract_snapshot_change()
RETURNS trigger AS $$
BEGIN
  IF NEW."contract_snapshot" IS DISTINCT FROM OLD."contract_snapshot" THEN
    RAISE EXCEPTION 'ODK contract snapshots are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "odk_orders_contract_snapshot_immutable"
BEFORE UPDATE ON "odk_orders"
FOR EACH ROW EXECUTE FUNCTION prevent_odk_contract_snapshot_change();

CREATE TRIGGER "odk_entitlements_contract_snapshot_immutable"
BEFORE UPDATE ON "odk_entitlements"
FOR EACH ROW EXECUTE FUNCTION prevent_odk_contract_snapshot_change();

CREATE OR REPLACE FUNCTION version_odk_package_contract()
RETURNS trigger AS $$
BEGIN
  IF ROW(NEW."title", NEW."slug", NEW."description", NEW."price_cents", NEW."original_price_cents", NEW."duration_days", NEW."is_active", NEW."contract_policy")
     IS DISTINCT FROM
     ROW(OLD."title", OLD."slug", OLD."description", OLD."price_cents", OLD."original_price_cents", OLD."duration_days", OLD."is_active", OLD."contract_policy") THEN
    NEW."contract_version" := GREATEST(NEW."contract_version", OLD."contract_version" + 1);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "odk_packages_contract_version"
BEFORE UPDATE ON "odk_packages"
FOR EACH ROW EXECUTE FUNCTION version_odk_package_contract();

CREATE OR REPLACE FUNCTION version_odk_package_exam_mapping()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND OLD."package_id" IS DISTINCT FROM NEW."package_id") THEN
    UPDATE "odk_packages" SET "contract_version" = "contract_version" + 1 WHERE "id" = OLD."package_id";
  END IF;
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE "odk_packages" SET "contract_version" = "contract_version" + 1 WHERE "id" = NEW."package_id";
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "odk_package_exams_contract_version"
AFTER INSERT OR UPDATE OR DELETE ON "odk_package_exams"
FOR EACH ROW EXECUTE FUNCTION version_odk_package_exam_mapping();

CREATE OR REPLACE FUNCTION version_odk_packages_for_exam_change()
RETURNS trigger AS $$
BEGIN
  IF ROW(NEW."series_id", NEW."title", NEW."slug", NEW."family", NEW."starts_at", NEW."ends_at", NEW."late_entry_minutes", NEW."attempt_limit", NEW."meet_required", NEW."answer_key_released_at", NEW."results_released_at")
     IS DISTINCT FROM
     ROW(OLD."series_id", OLD."title", OLD."slug", OLD."family", OLD."starts_at", OLD."ends_at", OLD."late_entry_minutes", OLD."attempt_limit", OLD."meet_required", OLD."answer_key_released_at", OLD."results_released_at") THEN
    UPDATE "odk_packages" p
    SET "contract_version" = p."contract_version" + 1
    FROM "odk_package_exams" pe
    WHERE pe."exam_id" = NEW."id" AND pe."package_id" = p."id";
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "odk_exams_package_contract_version"
AFTER UPDATE ON "odk_exams"
FOR EACH ROW EXECUTE FUNCTION version_odk_packages_for_exam_change();
