-- FAZ 5: ODK paket pazarlama alanları (non-destructive, additive)
-- öne çıkan paket bayrağı + satın alma CTA metni.
ALTER TABLE "odk_packages"
  ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "cta_text" TEXT;

CREATE INDEX IF NOT EXISTS "odk_packages_is_featured_idx"
  ON "odk_packages" ("is_featured");
