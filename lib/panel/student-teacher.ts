/**
 * Öğrenci ↔ öğretmen branş ilişkisi — saf domain kuralları (DB yok).
 */

export type StudentTeacherLinkInput = {
  studentId: string;
  teacherId: string;
  subject: string;
};

export function normalizeSubject(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function assertValidSubject(subject: string): string {
  const normalized = normalizeSubject(subject);
  if (normalized.length < 2 || normalized.length > 80) {
    throw new StudentTeacherLinkError("INVALID_SUBJECT", "Branş/ders adı 2–80 karakter olmalı.");
  }
  return normalized;
}

export class StudentTeacherLinkError extends Error {
  code: "INVALID_SUBJECT" | "DUPLICATE_ACTIVE" | "NOT_FOUND" | "TEACHER_INACTIVE" | "STUDENT_INACTIVE";

  constructor(code: StudentTeacherLinkError["code"], message: string) {
    super(message);
    this.code = code;
  }
}

/** Veliye gösterilecek öğretmen kartı — telefon / internal not yok. */
export type ParentVisibleTeacher = {
  assignmentId: string;
  teacherUserId: string;
  teacherName: string;
  subject: string;
  bio: string | null;
};

export function toParentVisibleTeacher(input: {
  assignmentId: string;
  teacherUserId: string;
  teacherName: string | null;
  teacherEmail: string;
  subject: string;
  bio: string | null;
}): ParentVisibleTeacher {
  return {
    assignmentId: input.assignmentId,
    teacherUserId: input.teacherUserId,
    teacherName: input.teacherName?.trim() || input.teacherEmail,
    subject: input.subject,
    bio: input.bio,
  };
}

/** Aktif ilişkilerde aynı (öğrenci, öğretmen, branş) yinelenmesin. */
export function isDuplicateActiveLink(
  existing: Array<{ teacherId: string; subject: string; active: boolean }>,
  teacherId: string,
  subject: string,
): boolean {
  const normalized = normalizeSubject(subject).toLocaleLowerCase("tr-TR");
  return existing.some(
    (row) =>
      row.active &&
      row.teacherId === teacherId &&
      normalizeSubject(row.subject).toLocaleLowerCase("tr-TR") === normalized,
  );
}
