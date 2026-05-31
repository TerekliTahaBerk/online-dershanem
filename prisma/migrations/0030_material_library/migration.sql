-- Phase 2 / Session 5 — Material Library foundation
-- Minimal additive schema for shared course/class materials. URL-first;
-- file uploads via Vercel Blob are intentionally deferred (the storage
-- helper exists in odk admin but is not generalized for materials yet).
--
-- Permission boundary (enforced at the application layer in
-- lib/panel/materials.ts):
--   - Teacher writes only to classrooms they teach (ClassroomTeacher).
--   - Student reads only published materials whose classroomId matches an
--     active ClassroomStudent (leftAt: null) OR whose courseId is taught
--     to the student via a Lesson row, depending on visibility.
--   - Visibility STUDENTS/CLASSROOM are student-readable; TEACHERS is
--     teacher-only; PRIVATE is creator-only.
-- The DB does not enforce these — it just stores the row and the index
-- shapes that make the auth queries cheap.

-- 1) MaterialType enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaterialType') THEN
    CREATE TYPE "MaterialType" AS ENUM ('PDF', 'VIDEO', 'LINK', 'FILE', 'NOTE');
  END IF;
END
$$;

-- 2) MaterialVisibility enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MaterialVisibility') THEN
    CREATE TYPE "MaterialVisibility" AS ENUM ('CLASSROOM', 'STUDENTS', 'TEACHERS', 'PRIVATE');
  END IF;
END
$$;

-- 3) Material table
CREATE TABLE IF NOT EXISTS "Material" (
  "id"           TEXT                  NOT NULL,
  "title"        TEXT                  NOT NULL,
  "description"  TEXT,
  "type"         "MaterialType"        NOT NULL DEFAULT 'LINK',
  "url"          TEXT,
  "fileUrl"      TEXT,
  "subject"      TEXT,
  "courseId"     TEXT,
  "classroomId"  TEXT,
  "teacherId"    TEXT,
  "createdById"  TEXT,
  "visibility"   "MaterialVisibility"  NOT NULL DEFAULT 'CLASSROOM',
  "isPublished"  BOOLEAN               NOT NULL DEFAULT TRUE,
  "isArchived"   BOOLEAN               NOT NULL DEFAULT FALSE,
  "publishedAt"  TIMESTAMP(3),
  "createdAt"    TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3)          NOT NULL,
  CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Material_courseId_fkey') THEN
    ALTER TABLE "Material"
      ADD CONSTRAINT "Material_courseId_fkey"
      FOREIGN KEY ("courseId") REFERENCES "Course"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Material_classroomId_fkey') THEN
    ALTER TABLE "Material"
      ADD CONSTRAINT "Material_classroomId_fkey"
      FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Material_teacherId_fkey') THEN
    ALTER TABLE "Material"
      ADD CONSTRAINT "Material_teacherId_fkey"
      FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Material_createdById_fkey') THEN
    ALTER TABLE "Material"
      ADD CONSTRAINT "Material_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS "Material_classroomId_isPublished_createdAt_idx"
  ON "Material" ("classroomId", "isPublished", "createdAt");

CREATE INDEX IF NOT EXISTS "Material_courseId_isPublished_idx"
  ON "Material" ("courseId", "isPublished");

CREATE INDEX IF NOT EXISTS "Material_teacherId_createdAt_idx"
  ON "Material" ("teacherId", "createdAt");

CREATE INDEX IF NOT EXISTS "Material_createdById_idx"
  ON "Material" ("createdById");

CREATE INDEX IF NOT EXISTS "Material_visibility_isPublished_idx"
  ON "Material" ("visibility", "isPublished");
