import type { CurriculumExam, MockExamErrorCategory } from "@prisma/client";

/** Dış deneme (MockExam) kaydının istemciye giden görünümü. ODK'dan ayrıdır. */
export type MockExamView = {
  id: string;
  studentId: string;
  exam: CurriculumExam;
  title: string;
  publisher: string;
  takenAt: string;
  durationMinutes: number | null;
  nextAction: string;
  sections: {
    id: string;
    subjectCode: string;
    subjectName: string;
    questionCount: number;
    correctCount: number;
    incorrectCount: number;
    blankCount: number;
    durationMinutes: number | null;
    errors: MockExamErrorCategory[];
  }[];
};

/** Giriş formundaki tek bölümün düzenlenebilir durumu. */
export type SectionState = {
  subjectCode: string;
  correctCount: number;
  incorrectCount: number;
  blankCount: number;
  durationMinutes: number;
  errorCategories: MockExamErrorCategory[];
};
