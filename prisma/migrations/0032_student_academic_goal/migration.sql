-- Phase 2 / Session 7 — Student Academic Goal (Roadmap / Target Tracker)
--
-- Additive only: a new enum + a new table. Existing `StudentGoal` (generic
-- micro-goal: title/value/unit/dueAt) is preserved; this new model is the
-- dedicated academic-target tracker with exam type / university / score
-- targets.
--
-- Idempotent: safe to re-run via `prisma migrate deploy`.

-- ─────────────────────────────────────────────────────────────────────────
-- Enum: AcademicGoalExamType
-- ─────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AcademicGoalExamType') THEN
    CREATE TYPE "AcademicGoalExamType" AS ENUM ('TYT', 'AYT', 'LGS', 'YKS', 'OTHER');
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Table: StudentAcademicGoal
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "StudentAcademicGoal" (
  "id"               TEXT NOT NULL,
  "studentId"        TEXT NOT NULL,
  "examType"         "AcademicGoalExamType",
  "targetUniversity" TEXT,
  "targetDepartment" TEXT,
  "targetSchool"     TEXT,
  "targetScore"      DECIMAL(8,2),
  "targetNet"        DECIMAL(8,2),
  "targetRank"       INTEGER,
  "targetDate"       TIMESTAMP(3),
  "note"             TEXT,
  "isActive"         BOOLEAN NOT NULL DEFAULT true,
  "createdById"      TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentAcademicGoal_pkey" PRIMARY KEY ("id")
);

-- FK: studentId -> Student.id (cascade so deleting a student wipes goals)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'StudentAcademicGoal_studentId_fkey'
  ) THEN
    ALTER TABLE "StudentAcademicGoal"
      ADD CONSTRAINT "StudentAcademicGoal_studentId_fkey"
      FOREIGN KEY ("studentId") REFERENCES "Student"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;

-- FK: createdById -> User.id (set null when reviewer/creator user is removed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'StudentAcademicGoal_createdById_fkey'
  ) THEN
    ALTER TABLE "StudentAcademicGoal"
      ADD CONSTRAINT "StudentAcademicGoal_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS "StudentAcademicGoal_studentId_isActive_idx"
  ON "StudentAcademicGoal" ("studentId", "isActive");

CREATE INDEX IF NOT EXISTS "StudentAcademicGoal_targetDate_idx"
  ON "StudentAcademicGoal" ("targetDate");
