-- The business workspace is visible to admins immediately after a deploy, so its
-- required reference rows must be installed with migrations rather than relying
-- on an optional seed command.
INSERT INTO "business_units" (
    "id",
    "code",
    "name",
    "product",
    "is_active",
    "retention_days",
    "created_at",
    "updated_at"
)
VALUES
    ('cbusinessunitod000000000001', 'OD', 'OnlineDershanem', 'OD', true, 730, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('cbusinessunitodk00000000001', 'ODK', 'OnlineDenemeKulübü', 'ODK', true, 730, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("product") DO UPDATE SET
    "name" = EXCLUDED."name",
    "is_active" = true,
    "updated_at" = CURRENT_TIMESTAMP;
