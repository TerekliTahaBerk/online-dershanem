import type { Prisma } from "@prisma/client";
import type { MockExamView } from "@/components/panel/mock-exam-workspace";

export const mockExamViewInclude = { sections: { orderBy: { position: "asc" as const }, include: { errors: { select: { category: true } } } } } satisfies Prisma.MockExamInclude;
type MockExamWithSections = Prisma.MockExamGetPayload<{ include: typeof mockExamViewInclude }>;

export function toMockExamView(exam: MockExamWithSections): MockExamView {
  return { id: exam.id, studentId: exam.studentId, exam: exam.exam, title: exam.title || "", publisher: exam.publisher || "", takenAt: exam.takenAt.toISOString(), durationMinutes: exam.durationMinutes, nextAction: exam.nextAction || "", sections: exam.sections.map((section) => ({ id: section.id, subjectCode: section.subjectCode, subjectName: section.subjectName, questionCount: section.questionCount, correctCount: section.correctCount, incorrectCount: section.incorrectCount, blankCount: section.blankCount, durationMinutes: section.durationMinutes, errors: section.errors.map((error) => error.category) })) };
}
