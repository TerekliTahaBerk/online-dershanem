ALTER TABLE notification_preferences
  ADD COLUMN quiet_start_minute integer,
  ADD COLUMN quiet_end_minute integer,
  ADD COLUMN daily_digest boolean NOT NULL DEFAULT false,
  ADD COLUMN daily_digest_minute integer,
  ADD CONSTRAINT notification_timing_valid CHECK (
    ((quiet_start_minute IS NULL AND quiet_end_minute IS NULL) OR (quiet_start_minute IS NOT NULL AND quiet_end_minute IS NOT NULL AND quiet_start_minute BETWEEN 0 AND 1439 AND quiet_end_minute BETWEEN 0 AND 1439 AND quiet_start_minute <> quiet_end_minute))
    AND (daily_digest_minute IS NULL OR daily_digest_minute BETWEEN 0 AND 1439)
    AND (NOT daily_digest OR daily_digest_minute IS NOT NULL)
  );
ALTER TABLE notifications
  ADD COLUMN in_app_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN delivery_pending boolean NOT NULL DEFAULT false,
  ADD COLUMN available_at timestamptz(3),
  ADD COLUMN source_type text,
  ADD COLUMN source_id text,
  ADD COLUMN source_version text,
  ADD COLUMN category text,
  ADD COLUMN preference_key text,
  ADD COLUMN digest_mode boolean NOT NULL DEFAULT false;
CREATE INDEX notifications_delivery_pending_available_at_idx ON notifications(delivery_pending, available_at);
