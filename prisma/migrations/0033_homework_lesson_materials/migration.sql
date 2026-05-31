-- 0033_homework_lesson_materials
-- Phase 2 / Session 9 — Connect Materials to Homework and Lessons.
-- Additive only. Idempotent. Composite primary key on join rows. Cascade
-- from both parent (assignment/lesson) and material so cleanup is automatic.

-- ── assignment_materials ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "assignment_materials" (
  "assignment_id" TEXT NOT NULL,
  "material_id"   TEXT NOT NULL,
  "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assignment_materials_pkey" PRIMARY KEY ("assignment_id", "material_id")
);

CREATE INDEX IF NOT EXISTS "assignment_materials_material_id_idx"
  ON "assignment_materials" ("material_id");

DO $$ BEGIN
  ALTER TABLE "assignment_materials"
    ADD CONSTRAINT "assignment_materials_assignment_id_fkey"
    FOREIGN KEY ("assignment_id") REFERENCES "Assignment"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "assignment_materials"
    ADD CONSTRAINT "assignment_materials_material_id_fkey"
    FOREIGN KEY ("material_id") REFERENCES "Material"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── lesson_materials ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "lesson_materials" (
  "lesson_id"   TEXT NOT NULL,
  "material_id" TEXT NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lesson_materials_pkey" PRIMARY KEY ("lesson_id", "material_id")
);

CREATE INDEX IF NOT EXISTS "lesson_materials_material_id_idx"
  ON "lesson_materials" ("material_id");

DO $$ BEGIN
  ALTER TABLE "lesson_materials"
    ADD CONSTRAINT "lesson_materials_lesson_id_fkey"
    FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lesson_materials"
    ADD CONSTRAINT "lesson_materials_material_id_fkey"
    FOREIGN KEY ("material_id") REFERENCES "Material"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
