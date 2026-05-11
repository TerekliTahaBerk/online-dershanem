-- ─────────────────────────────────────────────────────────────────────────────
-- Faz 4 / 0015_assignments
-- Ödev (Assignment) ve teslim (AssignmentSubmission) modelleri.
-- ─────────────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED', 'LATE', 'MISSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS "Assignment" (
  "id"            TEXT PRIMARY KEY,
  "teacherId"     TEXT NOT NULL,
  "classroomId"   TEXT,
  "studentId"     TEXT,
  "title"         TEXT NOT NULL,
  "description"   TEXT,
  "subject"       TEXT,
  "dueAt"         TIMESTAMP(3),
  "maxScore"      INTEGER,
  "attachmentUrl" TEXT,
  "status"        "AssignmentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Assignment_teacher_fkey"   FOREIGN KEY ("teacherId")   REFERENCES "Teacher"("id")   ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "Assignment_classroom_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Assignment_student_fkey"   FOREIGN KEY ("studentId")   REFERENCES "Student"("id")   ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Assignment_teacher_status_idx"   ON "Assignment"("teacherId", "status");
CREATE INDEX IF NOT EXISTS "Assignment_classroom_status_idx" ON "Assignment"("classroomId", "status");
CREATE INDEX IF NOT EXISTS "Assignment_dueAt_idx"            ON "Assignment"("dueAt");

CREATE TABLE IF NOT EXISTS "AssignmentSubmission" (
  "id"            TEXT PRIMARY KEY,
  "assignmentId"  TEXT NOT NULL,
  "studentId"     TEXT NOT NULL,
  "status"        "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
  "content"       TEXT,
  "attachmentUrl" TEXT,
  "submittedAt"   TIMESTAMP(3),
  "score"         INTEGER,
  "feedback"      TEXT,
  "gradedAt"      TIMESTAMP(3),
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AssignmentSubmission_assignment_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AssignmentSubmission_student_fkey"    FOREIGN KEY ("studentId")    REFERENCES "Student"("id")    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AssignmentSubmission_assignment_student_key" ON "AssignmentSubmission"("assignmentId", "studentId");
CREATE INDEX        IF NOT EXISTS "AssignmentSubmission_student_status_idx"     ON "AssignmentSubmission"("studentId", "status");
