-- ─────────────────────────────────────────────────────────────────────────────
-- Faz 0 / 0011_panel_foundation
-- Adds: Parent + ParentStudent, Classroom + ClassroomTeacher + ClassroomStudent,
--       Tag + StudentTag, Attendance.
-- All statements are idempotent (IF NOT EXISTS) so deploy is replay-safe.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Enums ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ClassroomLevel" AS ENUM ('LGS', 'TYT', 'AYT', 'YDT', 'MIXED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TagColor" AS ENUM ('GRAY', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'RED', 'PURPLE', 'PINK');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "TagScope" AS ENUM ('STUDENT', 'TEACHER', 'PARENT', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceContext" AS ENUM ('LESSON', 'CLASSROOM_SESSION');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── Parent ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Parent" (
  "id"          TEXT PRIMARY KEY,
  "fullName"    TEXT NOT NULL,
  "phone"       TEXT,
  "phoneKey"    TEXT,
  "email"       TEXT,
  "notes"       TEXT,
  "userId"      TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Parent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Parent_userId_key"   ON "Parent"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Parent_phoneKey_key" ON "Parent"("phoneKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Parent_email_key"    ON "Parent"("email");

CREATE TABLE IF NOT EXISTS "ParentStudent" (
  "parentId"     TEXT NOT NULL,
  "studentId"    TEXT NOT NULL,
  "relationship" TEXT,
  "isPrimary"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ParentStudent_pkey" PRIMARY KEY ("parentId", "studentId"),
  CONSTRAINT "ParentStudent_parent_fkey"  FOREIGN KEY ("parentId")  REFERENCES "Parent"("id")  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ParentStudent_student_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ParentStudent_studentId_idx" ON "ParentStudent"("studentId");

-- ── Classroom ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Classroom" (
  "id"          TEXT PRIMARY KEY,
  "name"        TEXT NOT NULL,
  "branch"      TEXT,
  "level"       "ClassroomLevel" NOT NULL DEFAULT 'MIXED',
  "capacity"    INTEGER NOT NULL DEFAULT 30,
  "description" TEXT,
  "isActive"    BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Classroom_name_branch_key" ON "Classroom"("name", "branch");
CREATE INDEX        IF NOT EXISTS "Classroom_isActive_idx"    ON "Classroom"("isActive");

CREATE TABLE IF NOT EXISTS "ClassroomTeacher" (
  "classroomId" TEXT NOT NULL,
  "teacherId"   TEXT NOT NULL,
  "isLead"      BOOLEAN NOT NULL DEFAULT false,
  "subject"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassroomTeacher_pkey" PRIMARY KEY ("classroomId", "teacherId"),
  CONSTRAINT "ClassroomTeacher_classroom_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClassroomTeacher_teacher_fkey"   FOREIGN KEY ("teacherId")   REFERENCES "Teacher"("id")   ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ClassroomTeacher_teacherId_idx" ON "ClassroomTeacher"("teacherId");

CREATE TABLE IF NOT EXISTS "ClassroomStudent" (
  "classroomId" TEXT NOT NULL,
  "studentId"   TEXT NOT NULL,
  "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leftAt"      TIMESTAMP(3),
  CONSTRAINT "ClassroomStudent_pkey" PRIMARY KEY ("classroomId", "studentId"),
  CONSTRAINT "ClassroomStudent_classroom_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClassroomStudent_student_fkey"   FOREIGN KEY ("studentId")   REFERENCES "Student"("id")   ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ClassroomStudent_studentId_idx" ON "ClassroomStudent"("studentId");
CREATE INDEX IF NOT EXISTS "ClassroomStudent_classroom_active_idx" ON "ClassroomStudent"("classroomId", "leftAt");

-- ── Tag system (general) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Tag" (
  "id"          TEXT PRIMARY KEY,
  "key"         TEXT NOT NULL,
  "label"       TEXT NOT NULL,
  "color"       "TagColor" NOT NULL DEFAULT 'GRAY',
  "scope"       "TagScope" NOT NULL DEFAULT 'STUDENT',
  "description" TEXT,
  "isSystem"    BOOLEAN NOT NULL DEFAULT false,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_key_key"   ON "Tag"("key");
CREATE INDEX        IF NOT EXISTS "Tag_scope_idx" ON "Tag"("scope");

CREATE TABLE IF NOT EXISTS "StudentTag" (
  "studentId"    TEXT NOT NULL,
  "tagId"        TEXT NOT NULL,
  "assignedById" TEXT,
  "assignedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"    TIMESTAMP(3),
  "note"         TEXT,
  CONSTRAINT "StudentTag_pkey" PRIMARY KEY ("studentId", "tagId"),
  CONSTRAINT "StudentTag_student_fkey"    FOREIGN KEY ("studentId")    REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudentTag_tag_fkey"        FOREIGN KEY ("tagId")        REFERENCES "Tag"("id")     ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudentTag_assignedBy_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id")    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "StudentTag_tagId_idx"        ON "StudentTag"("tagId");
CREATE INDEX IF NOT EXISTS "StudentTag_assignedById_idx" ON "StudentTag"("assignedById");

-- ── Attendance ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "Attendance" (
  "id"           TEXT PRIMARY KEY,
  "studentId"    TEXT NOT NULL,
  "context"      "AttendanceContext"  NOT NULL DEFAULT 'LESSON',
  "lessonId"     TEXT,
  "classroomId"  TEXT,
  "sessionDate"  TIMESTAMP(3) NOT NULL,
  "status"       "AttendanceStatus"   NOT NULL,
  "minutesLate"  INTEGER,
  "notes"        TEXT,
  "recordedById" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Attendance_student_fkey"    FOREIGN KEY ("studentId")    REFERENCES "Student"("id")   ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Attendance_lesson_fkey"     FOREIGN KEY ("lessonId")     REFERENCES "Lesson"("id")    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Attendance_classroom_fkey"  FOREIGN KEY ("classroomId")  REFERENCES "Classroom"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Attendance_recordedBy_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id")      ON DELETE SET NULL ON UPDATE CASCADE
);
-- One attendance record per (student, lesson). Allows null lessonId for classroom-session entries.
CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_student_lesson_unique"  ON "Attendance"("studentId", "lessonId") WHERE "lessonId" IS NOT NULL;
CREATE INDEX        IF NOT EXISTS "Attendance_student_session_idx"    ON "Attendance"("studentId", "sessionDate");
CREATE INDEX        IF NOT EXISTS "Attendance_classroom_session_idx"  ON "Attendance"("classroomId", "sessionDate");
CREATE INDEX        IF NOT EXISTS "Attendance_status_idx"             ON "Attendance"("status");
