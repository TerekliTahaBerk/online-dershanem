import type { CurriculumExam } from "@prisma/client";
import { mockExamTemplates } from "@/lib/mock-exams";
import type { SectionState } from "./types";

export function initialSections(exam: CurriculumExam): SectionState[] {
  return mockExamTemplates[exam].sections.map((section) => ({
    subjectCode: section.code,
    correctCount: 0,
    incorrectCount: 0,
    blankCount: section.questions,
    durationMinutes: 0,
    errorCategories: [],
  }));
}

export function countBand(count: number) {
  return count === 0
    ? ("0" as const)
    : count === 1
      ? ("1" as const)
      : count <= 3
        ? ("2-3" as const)
        : ("4+" as const);
}
