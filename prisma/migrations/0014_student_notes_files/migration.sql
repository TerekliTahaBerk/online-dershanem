-- ─────────────────────────────────────────────────────────────────────────────
-- Faz 3 / 0014_student_notes_files
-- CRM derinleşmesi: StudentNote (iç notlar), TeacherComment (öğretmen yorumu),
-- StudentFile (dosya/transkript/ödev evrakı).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "StudentNote" (
  "id"        TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL,
  "authorId"  TEXT,
  "content"   TEXT NOT NULL,
  "isPrivate" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentNote_student_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "StudentNote_author_fkey"  FOREIGN KEY ("authorId")  REFERENCES "User"("id")    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "StudentNote_student_idx" ON "StudentNote"("studentId", "createdAt");

CREATE TABLE IF NOT EXISTS "TeacherComment" (
  "id"              TEXT PRIMARY KEY,
  "studentId"       TEXT NOT NULL,
  "teacherId"       TEXT NOT NULL,
  "content"         TEXT NOT NULL,
  "rating"          INTEGER,
  "visibleToParent" BOOLEAN NOT NULL DEFAULT true,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeacherComment_student_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TeacherComment_teacher_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "TeacherComment_student_idx" ON "TeacherComment"("studentId", "createdAt");
CREATE INDEX IF NOT EXISTS "TeacherComment_teacher_idx" ON "TeacherComment"("teacherId", "createdAt");

CREATE TABLE IF NOT EXISTS "StudentFile" (
  "id"           TEXT PRIMARY KEY,
  "studentId"    TEXT NOT NULL,
  "uploadedById" TEXT,
  "fileName"     TEXT NOT NULL,
  "fileUrl"      TEXT NOT NULL,
  "byteSize"     INTEGER NOT NULL DEFAULT 0,
  "mimeType"     TEXT,
  "description"  TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StudentFile_student_fkey"   FOREIGN KEY ("studentId")    REFERENCES "Student"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "StudentFile_uploadedBy_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id")    ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "StudentFile_student_idx" ON "StudentFile"("studentId", "createdAt");
