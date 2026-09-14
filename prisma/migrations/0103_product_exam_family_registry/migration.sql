CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "target_audience" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "exam_families" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "exam_families_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "products_code_key" ON "products"("code");
CREATE UNIQUE INDEX "exam_families_code_key" ON "exam_families"("code");
CREATE INDEX "exam_families_product_id_is_active_idx" ON "exam_families"("product_id", "is_active");

ALTER TABLE "exam_families"
  ADD CONSTRAINT "exam_families_product_id_fkey"
  FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "products" ("id", "code", "name", "target_audience") VALUES
  ('product_registry_od', 'OD', 'Online Dershanem', 'k12'),
  ('product_registry_ok', 'OK', 'Online Koçum', 'k12'),
  ('product_registry_odk', 'ODK', 'Online Deneme Kulübü', 'k12');

INSERT INTO "exam_families" ("id", "code", "name", "product_id") VALUES
  ('exam_family_lgs', 'LGS', 'LGS', 'product_registry_odk'),
  ('exam_family_tyt', 'TYT', 'TYT', 'product_registry_odk'),
  ('exam_family_ayt', 'AYT', 'AYT', 'product_registry_odk'),
  ('exam_family_ydt', 'YDT', 'YDT', 'product_registry_od');

ALTER TABLE "business_units" ADD COLUMN "product_ref_id" TEXT;
ALTER TABLE "product_memberships" ADD COLUMN "product_ref_id" TEXT;
ALTER TABLE "student_progress_evidence" ADD COLUMN "product_ref_id" TEXT;
ALTER TABLE "commerce_order_lines" ADD COLUMN "product_ref_id" TEXT;
ALTER TABLE "curriculum_versions" ADD COLUMN "exam_family_ref_id" TEXT;
ALTER TABLE "mock_exams" ADD COLUMN "exam_family_ref_id" TEXT;
ALTER TABLE "odk_exam_series" ADD COLUMN "exam_family_ref_id" TEXT;
ALTER TABLE "odk_exams" ADD COLUMN "exam_family_ref_id" TEXT;

UPDATE "business_units" source SET "product_ref_id" = registry."id"
FROM "products" registry WHERE registry."code" = source."product"::text;
UPDATE "product_memberships" source SET "product_ref_id" = registry."id"
FROM "products" registry WHERE registry."code" = source."product"::text;
UPDATE "student_progress_evidence" source SET "product_ref_id" = registry."id"
FROM "products" registry WHERE registry."code" = source."product_code"::text;
UPDATE "commerce_order_lines" source SET "product_ref_id" = registry."id"
FROM "products" registry WHERE registry."code" = source."product"::text;
UPDATE "curriculum_versions" source SET "exam_family_ref_id" = registry."id"
FROM "exam_families" registry WHERE registry."code" = source."exam"::text;
UPDATE "mock_exams" source SET "exam_family_ref_id" = registry."id"
FROM "exam_families" registry WHERE registry."code" = source."exam"::text;
UPDATE "odk_exam_series" source SET "exam_family_ref_id" = registry."id"
FROM "exam_families" registry WHERE registry."code" = source."family"::text;
UPDATE "odk_exams" source SET "exam_family_ref_id" = registry."id"
FROM "exam_families" registry WHERE registry."code" = source."family"::text;

CREATE INDEX "business_units_product_ref_id_idx" ON "business_units"("product_ref_id");
CREATE INDEX "product_memberships_product_ref_id_idx" ON "product_memberships"("product_ref_id");
CREATE INDEX "student_progress_evidence_product_ref_id_idx" ON "student_progress_evidence"("product_ref_id");
CREATE INDEX "commerce_order_lines_product_ref_id_idx" ON "commerce_order_lines"("product_ref_id");
CREATE INDEX "curriculum_versions_exam_family_ref_id_idx" ON "curriculum_versions"("exam_family_ref_id");
CREATE INDEX "mock_exams_exam_family_ref_id_idx" ON "mock_exams"("exam_family_ref_id");
CREATE INDEX "odk_exam_series_exam_family_ref_id_idx" ON "odk_exam_series"("exam_family_ref_id");
CREATE INDEX "odk_exams_exam_family_ref_id_idx" ON "odk_exams"("exam_family_ref_id");

ALTER TABLE "business_units" ADD CONSTRAINT "business_units_product_ref_id_fkey"
  FOREIGN KEY ("product_ref_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_memberships" ADD CONSTRAINT "product_memberships_product_ref_id_fkey"
  FOREIGN KEY ("product_ref_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "student_progress_evidence" ADD CONSTRAINT "student_progress_evidence_product_ref_id_fkey"
  FOREIGN KEY ("product_ref_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "commerce_order_lines" ADD CONSTRAINT "commerce_order_lines_product_ref_id_fkey"
  FOREIGN KEY ("product_ref_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_exam_family_ref_id_fkey"
  FOREIGN KEY ("exam_family_ref_id") REFERENCES "exam_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "mock_exams" ADD CONSTRAINT "mock_exams_exam_family_ref_id_fkey"
  FOREIGN KEY ("exam_family_ref_id") REFERENCES "exam_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exam_series" ADD CONSTRAINT "odk_exam_series_exam_family_ref_id_fkey"
  FOREIGN KEY ("exam_family_ref_id") REFERENCES "exam_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "odk_exams" ADD CONSTRAINT "odk_exams_exam_family_ref_id_fkey"
  FOREIGN KEY ("exam_family_ref_id") REFERENCES "exam_families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "business_units" s LEFT JOIN "products" r ON r."id" = s."product_ref_id" WHERE r."code" IS DISTINCT FROM s."product"::text
    UNION ALL SELECT 1 FROM "product_memberships" s LEFT JOIN "products" r ON r."id" = s."product_ref_id" WHERE r."code" IS DISTINCT FROM s."product"::text
    UNION ALL SELECT 1 FROM "student_progress_evidence" s LEFT JOIN "products" r ON r."id" = s."product_ref_id" WHERE r."code" IS DISTINCT FROM s."product_code"::text
    UNION ALL SELECT 1 FROM "commerce_order_lines" s LEFT JOIN "products" r ON r."id" = s."product_ref_id" WHERE r."code" IS DISTINCT FROM s."product"::text
    UNION ALL SELECT 1 FROM "curriculum_versions" s LEFT JOIN "exam_families" r ON r."id" = s."exam_family_ref_id" WHERE r."code" IS DISTINCT FROM s."exam"::text
    UNION ALL SELECT 1 FROM "mock_exams" s LEFT JOIN "exam_families" r ON r."id" = s."exam_family_ref_id" WHERE r."code" IS DISTINCT FROM s."exam"::text
    UNION ALL SELECT 1 FROM "odk_exam_series" s LEFT JOIN "exam_families" r ON r."id" = s."exam_family_ref_id" WHERE r."code" IS DISTINCT FROM s."family"::text
    UNION ALL SELECT 1 FROM "odk_exams" s LEFT JOIN "exam_families" r ON r."id" = s."exam_family_ref_id" WHERE r."code" IS DISTINCT FROM s."family"::text
  ) THEN
    RAISE EXCEPTION 'Product/ExamFamily bridge backfill left inconsistent rows';
  END IF;
END $$;
