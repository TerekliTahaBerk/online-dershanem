-- Production migration preflight (READ ONLY).
-- Run this against production BEFORE 0101_purchase_event_provider_reference_unique.
-- Any returned row must be investigated and reconciled before the migration.
SELECT
  "providerReference" AS provider_reference,
  COUNT(*)::integer AS duplicate_count,
  MIN("createdAt") AS first_seen_at,
  MAX("createdAt") AS last_seen_at
FROM "PurchaseEvent"
WHERE "providerReference" IS NOT NULL
GROUP BY "providerReference"
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, provider_reference;
