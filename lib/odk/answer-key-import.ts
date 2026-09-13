/**
 * Cevap anahtarı JSON import — preview önce, commit sonra.
 * Schema versioned; LIVE sonrası değişiklik revision + rescore ister.
 */

import { z } from "zod";

export const ANSWER_KEY_SCHEMA_VERSION = "1.0";
const OPTION = z.enum(["A", "B", "C", "D", "E"]);

export const AnswerKeySectionSchema = z.object({
  code: z.string().trim().min(1).max(32),
  answers: z.record(z.string().regex(/^\d+$/), OPTION),
});

export const AnswerKeyDocumentSchema = z.object({
  schemaVersion: z.string().default(ANSWER_KEY_SCHEMA_VERSION),
  version: z.number().int().positive().optional(),
  examType: z.enum(["LGS", "TYT", "AYT"]).optional(),
  sections: z.array(AnswerKeySectionSchema).min(1).max(12),
});

export type AnswerKeyDocument = z.infer<typeof AnswerKeyDocumentSchema>;

export type AnswerKeyImportIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  sectionCode?: string;
  questionNumber?: number;
};

export type AnswerKeyImportPreview = {
  schemaVersion: string;
  totalAnswers: number;
  validAnswers: number;
  issues: AnswerKeyImportIssue[];
  mappings: Array<{ sectionCode: string; questionNumber: number; correctOption: "A" | "B" | "C" | "D" | "E" }>;
};

export type ExamQuestionRef = {
  sectionCode: string;
  questionNumber: number;
};

export function previewAnswerKeyImport(
  payload: unknown,
  examQuestions: ExamQuestionRef[],
  expectedExamType?: "LGS" | "TYT" | "AYT",
): AnswerKeyImportPreview {
  const issues: AnswerKeyImportIssue[] = [];
  const parsed = AnswerKeyDocumentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      schemaVersion: ANSWER_KEY_SCHEMA_VERSION,
      totalAnswers: 0,
      validAnswers: 0,
      issues: [{ level: "error", code: "INVALID_STRUCTURE", message: parsed.error.issues[0]?.message || "Cevap anahtarı JSON yapısı geçersiz." }],
      mappings: [],
    };
  }

  const doc = parsed.data;
  if (expectedExamType && doc.examType && doc.examType !== expectedExamType) {
    issues.push({ level: "error", code: "EXAM_TYPE_MISMATCH", message: `JSON sınav türü ${doc.examType}, deneme ${expectedExamType}.` });
  }

  const questionSet = new Set(examQuestions.map((q) => `${q.sectionCode}:${q.questionNumber}`));
  const sectionCodes = new Set(examQuestions.map((q) => q.sectionCode));
  const seen = new Set<string>();
  const mappings: AnswerKeyImportPreview["mappings"] = [];

  for (const section of doc.sections) {
    if (!sectionCodes.has(section.code)) {
      issues.push({ level: "error", code: "UNKNOWN_SECTION", message: `Bilinmeyen bölüm: ${section.code}`, sectionCode: section.code });
      continue;
    }
    for (const [rawNumber, option] of Object.entries(section.answers)) {
      const questionNumber = Number(rawNumber);
      const key = `${section.code}:${questionNumber}`;
      if (seen.has(key)) {
        issues.push({ level: "error", code: "DUPLICATE_ANSWER", message: "Aynı soru için birden fazla cevap.", sectionCode: section.code, questionNumber });
        continue;
      }
      seen.add(key);
      if (!questionSet.has(key)) {
        issues.push({ level: "error", code: "UNKNOWN_QUESTION", message: "Denemede karşılığı olmayan soru.", sectionCode: section.code, questionNumber });
        continue;
      }
      mappings.push({ sectionCode: section.code, questionNumber, correctOption: option });
    }
  }

  for (const question of examQuestions) {
    const key = `${question.sectionCode}:${question.questionNumber}`;
    if (!seen.has(key)) {
      issues.push({ level: "error", code: "MISSING_ANSWER", message: "Cevap anahtarında eksik soru.", sectionCode: question.sectionCode, questionNumber: question.questionNumber });
    }
  }

  const errorCount = issues.filter((issue) => issue.level === "error").length;
  return {
    schemaVersion: doc.schemaVersion || ANSWER_KEY_SCHEMA_VERSION,
    totalAnswers: seen.size,
    validAnswers: errorCount ? 0 : mappings.length,
    issues,
    mappings: errorCount ? [] : mappings,
  };
}

export function summarizeAnswerKeyPreview(preview: AnswerKeyImportPreview) {
  const errors = preview.issues.filter((issue) => issue.level === "error").length;
  return {
    found: preview.totalAnswers,
    valid: preview.validAnswers,
    errors,
    ready: errors === 0 && preview.validAnswers > 0,
  };
}
