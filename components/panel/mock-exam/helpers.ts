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

/**
 * Uç hatasının kullanıcı metni. Yönetici yazmaları taze step-up ister
 * (428 `STEP_UP_REQUIRED`); bu durumda nereden doğrulanacağı söylenir.
 */
export function mockExamErrorText(body: { error?: string; code?: string }, fallback: string) {
  const text = body.error || fallback;
  return body.code === "STEP_UP_REQUIRED" ? `${text} Güvenlik sayfasından (/panel/guvenlik) doğrulayıp tekrar deneyin.` : text;
}
