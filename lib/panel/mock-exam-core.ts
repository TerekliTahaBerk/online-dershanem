import type { MockExamErrorCategory } from "@prisma/client";
import { operationDigest } from "./group-mutation-core";

/** Revizyon: bölüm nedenleri + onaylı sonraki adım. Neden düzenleyen herkes aynı özeti görür. */
export function mockExamRevision(exam: { nextAction: string | null; sections: { id: string; errors: { category: MockExamErrorCategory }[] }[] }) {
  return operationDigest({
    nextAction: exam.nextAction ?? null,
    reasons: [...exam.sections].sort((a, b) => a.id.localeCompare(b.id)).map((section) => [section.id, section.errors.map((error) => error.category).sort()]),
  });
}
