-- PayTR ve diğer ödeme sağlayıcıları webhook'ları en az bir kez teslim eder.
-- Migration öncesi production'da scripts/check-purchase-event-provider-reference-duplicates.sql
-- çalıştırılmalı; aşağıdaki guard da gözden kaçan duplicate veride migration'ı durdurur.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "PurchaseEvent"
    WHERE "providerReference" IS NOT NULL
    GROUP BY "providerReference"
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'PurchaseEvent.providerReference duplicate rows exist; run the preflight query and reconcile them before retrying';
  END IF;
END
$$;

CREATE UNIQUE INDEX "PurchaseEvent_providerReference_key"
  ON "PurchaseEvent"("providerReference");
