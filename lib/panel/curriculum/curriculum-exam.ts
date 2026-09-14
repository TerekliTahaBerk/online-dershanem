import type { CurriculumExam } from "@prisma/client";

type CurriculumExamSource = {
  exam: CurriculumExam | null;
  examFamilyRef?: { code: string } | null;
};

/** Legacy enum değerini, yoksa veri odaklı sınav ailesi kodunu gösterir. */
export function getCurriculumExamLabel(version: CurriculumExamSource): string {
  return version.exam ?? version.examFamilyRef?.code ?? "TANIMSIZ";
}
