-- Group 360: kapasite sayımı ve program taraması için yardımcı indeksler.

CREATE INDEX IF NOT EXISTS "enrollments_group_id_ended_at_idx"
  ON "enrollments" ("group_id", "ended_at");

CREATE INDEX IF NOT EXISTS "lessons_status_starts_at_idx"
  ON "lessons" ("status", "starts_at");

CREATE INDEX IF NOT EXISTS "lessons_group_id_status_starts_at_idx"
  ON "lessons" ("group_id", "status", "starts_at");
