-- 0022_odk_paytr_provider
-- PayTR provider enum değerini OdkPaymentProvider'a ekler.
-- Non-destructive: yalnızca ADD VALUE.

ALTER TYPE "OdkPaymentProvider" ADD VALUE IF NOT EXISTS 'PAYTR';
