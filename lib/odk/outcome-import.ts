/**
 * Kazanım (learning outcome) JSON import — versioned schema, katalog bağlama.
 */

import { z } from "zod";

export const OUTCOME_SCHEMA_VERSION = "1.0";

const OutcomeItemSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(240).optional(),
  title: z.string().trim().min(1).max(240).optional(),
  topic: z.string().trim().max(120).optional(),
  subtopic: z.string().trim().max(120).optional(),
  isPrimary: z.boolean().optional(),
});

const QuestionOutcomeSchema = z.object({
  section: z.string().trim().min(1).max(32),
  question: z.number().int().positive(),
  outcomes: z.array(OutcomeItemSchema).min(1).max(5),
});

export const OutcomeDocumentSchema = z.object({
  schemaVersion: z.string().default(OUTCOME_SCHEMA_VERSION),
  version: z.number().int().positive().optional(),
  questions: z.array(QuestionOutcomeSchema).min(1),
});

export type OutcomeDocument = z.infer<typeof OutcomeDocumentSchema>;

export type OutcomeImportIssue = {
  level: "error" | "warning";
  code: string;
  message: string;
  sectionCode?: string;
  questionNumber?: number;
  outcomeCode?: string;
};

export type OutcomeCatalogHit = { id: string; code: string; title: string };

export type OutcomeImportPreview = {
  schemaVersion: string;
  totalMappings: number;
  catalogHits: number;
  unresolvedCodes: string[];
  issues: OutcomeImportIssue[];
  mappings: Array<{
    sectionCode: string;
    questionNumber: number;
    outcomes: Array<{ code: string; title: string; topic?: string; subtopic?: string; isPrimary: boolean; catalogId: string | null }>;
  }>;
};

export function previewOutcomeImport(
  payload: unknown,
  examQuestions: Array<{ sectionCode: string; questionNumber: number }>,
  catalog: OutcomeCatalogHit[],
): OutcomeImportPreview {
  const issues: OutcomeImportIssue[] = [];
  const parsed = OutcomeDocumentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      schemaVersion: OUTCOME_SCHEMA_VERSION,
      totalMappings: 0,
      catalogHits: 0,
      unresolvedCodes: [],
      issues: [{ level: "error", code: "INVALID_STRUCTURE", message: parsed.error.issues[0]?.message || "Kazanım JSON yapısı geçersiz." }],
      mappings: [],
    };
  }

  const questionSet = new Set(examQuestions.map((q) => `${q.sectionCode}:${q.questionNumber}`));
  const catalogByCode = new Map(catalog.map((item) => [item.code, item]));
  const seenQuestions = new Set<string>();
  const unresolved = new Set<string>();
  let catalogHits = 0;
  const mappings: OutcomeImportPreview["mappings"] = [];

  for (const row of parsed.data.questions) {
    const key = `${row.section}:${row.question}`;
    if (seenQuestions.has(key)) {
      issues.push({ level: "error", code: "DUPLICATE_QUESTION_MAPPING", message: "Aynı soru için tekrarlayan kazanım satırı.", sectionCode: row.section, questionNumber: row.question });
      continue;
    }
    seenQuestions.add(key);
    if (!questionSet.has(key)) {
      issues.push({ level: "error", code: "MISSING_QUESTION", message: "Denemede karşılığı olmayan soru.", sectionCode: row.section, questionNumber: row.question });
      continue;
    }

    const outcomeCodes = new Set<string>();
    const outcomes: OutcomeImportPreview["mappings"][number]["outcomes"] = [];
    for (const [index, outcome] of row.outcomes.entries()) {
      if (outcomeCodes.has(outcome.code)) {
        issues.push({ level: "error", code: "DUPLICATE_OUTCOME", message: "Aynı kazanım kodu soruda tekrarlanamaz.", sectionCode: row.section, questionNumber: row.question, outcomeCode: outcome.code });
        continue;
      }
      outcomeCodes.add(outcome.code);
      const hit = catalogByCode.get(outcome.code) || null;
      if (hit) catalogHits += 1;
      else unresolved.add(outcome.code);
      const title = outcome.name || outcome.title || hit?.title || outcome.code;
      outcomes.push({
        code: outcome.code,
        title,
        topic: outcome.topic,
        subtopic: outcome.subtopic,
        isPrimary: outcome.isPrimary ?? index === 0,
        catalogId: hit?.id ?? null,
      });
    }

    const primaries = outcomes.filter((item) => item.isPrimary);
    if (primaries.length !== 1) {
      issues.push({ level: "error", code: "PRIMARY_OUTCOME_REQUIRED", message: "Her sorunun tam bir ana kazanımı olmalıdır.", sectionCode: row.section, questionNumber: row.question });
    }
    mappings.push({ sectionCode: row.section, questionNumber: row.question, outcomes });
  }

  for (const question of examQuestions) {
    const key = `${question.sectionCode}:${question.questionNumber}`;
    if (!seenQuestions.has(key)) {
      issues.push({ level: "warning", code: "QUESTION_WITHOUT_OUTCOME", message: "Bu soru için kazanım eşlemesi yok.", sectionCode: question.sectionCode, questionNumber: question.questionNumber });
    }
  }

  if (unresolved.size) {
    issues.push({ level: "warning", code: "UNRESOLVED_OUTCOME_CODES", message: `${unresolved.size} kazanım kodu katalogda bulunamadı; commit öncesi eşleştirme gerekir.` });
  }

  const errors = issues.filter((issue) => issue.level === "error").length;
  return {
    schemaVersion: parsed.data.schemaVersion || OUTCOME_SCHEMA_VERSION,
    totalMappings: mappings.length,
    catalogHits,
    unresolvedCodes: [...unresolved],
    issues,
    mappings: errors ? [] : mappings,
  };
}
