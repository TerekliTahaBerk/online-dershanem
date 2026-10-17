/**
 * Kazanım (learning outcome) JSON import — versioned schema, katalog bağlama.
 *
 * Katalog sınavın AİLESİNE daraltılmış gelir (çağıran sorgular). Kod çözümü
 * sorunun dersine (bölüm kodu = müfredat dersi kodu, ailede o kodlu ders varsa)
 * ve sınavın müfredat yılına göre yapılır; başka dersin kazanımı ya da aynı
 * ders içinde birden çok kayda uyan kod hatadır (P0-5).
 */

import { createHash } from "node:crypto";
import { z } from "zod";

export const OUTCOME_SCHEMA_VERSION = "1.0";
export const SUPPORTED_OUTCOME_SCHEMA_VERSIONS: readonly string[] = ["1", "1.0"];

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

export type OutcomeCatalogHit = {
  id: string;
  code: string;
  title: string;
  /** Kazanımın müfredat dersi kodu (ör. MAT); bölüm koduyla eşleşir. */
  subjectCode?: string;
  academicYear?: number;
  versionStatus?: "ACTIVE" | "DRAFT" | string;
};

export type OutcomeResolution = { ok: true; hit: OutcomeCatalogHit } | { ok: false; code: "UNRESOLVED" | "OUTCOME_SUBJECT_MISMATCH" | "AMBIGUOUS_OUTCOME_CODE" };

/**
 * Bir kazanım kodunu sorunun bölümüne göre çözer.
 * 1. Ailede bölüm koduyla aynı kodlu ders varsa yalnız o dersin kazanımları aday olur
 *    (kod başka derste varsa OUTCOME_SUBJECT_MISMATCH).
 * 2. Adaylar sınavın müfredat yılına (yoksa en güncel yıla), sonra ACTIVE sürüme daraltılır.
 * 3. Hâlâ birden çok kayıt kalırsa AMBIGUOUS_OUTCOME_CODE.
 */
export function resolveOutcomeCode(catalog: readonly OutcomeCatalogHit[], code: string, sectionCode: string, academicYear: number | null | undefined): OutcomeResolution {
  const byCode = catalog.filter((item) => item.code === code);
  if (!byCode.length) return { ok: false, code: "UNRESOLVED" };
  const subjectKnown = catalog.some((item) => item.subjectCode === sectionCode);
  let candidates = subjectKnown ? byCode.filter((item) => item.subjectCode === sectionCode) : byCode;
  if (!candidates.length) return { ok: false, code: "OUTCOME_SUBJECT_MISMATCH" };
  const years = candidates.map((item) => item.academicYear ?? 0);
  const targetYear = academicYear && years.includes(academicYear) ? academicYear : Math.max(...years);
  candidates = candidates.filter((item) => (item.academicYear ?? 0) === targetYear);
  if (candidates.length > 1 && candidates.some((item) => item.versionStatus === "ACTIVE")) candidates = candidates.filter((item) => item.versionStatus === "ACTIVE");
  if (new Set(candidates.map((item) => item.id)).size > 1) return { ok: false, code: "AMBIGUOUS_OUTCOME_CODE" };
  return { ok: true, hit: candidates[0] };
}

/**
 * Önizleme ile commit arasındaki eşzamanlı değişikliği yakalayan hedef durum
 * hash'i: soru kimliği + import'un yazacağı alanın güncel değeri (P0-4).
 */
export function importTargetStateHash(rows: ReadonlyArray<{ id: string; state: string }>): string {
  const sorted = [...rows].sort((a, b) => a.id.localeCompare(b.id)).map((row) => [row.id, row.state]);
  return createHash("sha256").update(JSON.stringify(sorted)).digest("hex");
}

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
  options: { academicYear?: number | null } = {},
): OutcomeImportPreview {
  const issues: OutcomeImportIssue[] = [];
  const parsed = OutcomeDocumentSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      schemaVersion: OUTCOME_SCHEMA_VERSION,
      totalMappings: 0,
      catalogHits: 0,
      unresolvedCodes: [],
      issues: [{ level: "error", code: "INVALID_STRUCTURE", message: parsed.error.issues[0]?.message || "Kazanım JSON yapısı geçerli görünmüyor." }],
      mappings: [],
    };
  }

  if (!SUPPORTED_OUTCOME_SCHEMA_VERSIONS.includes(parsed.data.schemaVersion)) {
    return {
      schemaVersion: parsed.data.schemaVersion,
      totalMappings: 0,
      catalogHits: 0,
      unresolvedCodes: [],
      issues: [{ level: "error", code: "UNSUPPORTED_SCHEMA_VERSION", message: `Desteklenmeyen şema sürümü: ${parsed.data.schemaVersion}. Desteklenen: ${SUPPORTED_OUTCOME_SCHEMA_VERSIONS.join(", ")}.` }],
      mappings: [],
    };
  }

  const questionSet = new Set(examQuestions.map((q) => `${q.sectionCode}:${q.questionNumber}`));
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
      const resolution = resolveOutcomeCode(catalog, outcome.code, row.section, options.academicYear);
      const hit = resolution.ok ? resolution.hit : null;
      if (hit) catalogHits += 1;
      else if (resolution.ok === false && resolution.code === "UNRESOLVED") unresolved.add(outcome.code);
      else if (resolution.ok === false) {
        issues.push({
          level: "error",
          code: resolution.code,
          message: resolution.code === "OUTCOME_SUBJECT_MISMATCH" ? "Kazanım sorunun dersine ait değil." : "Kazanım kodu bu derste birden çok kayda uyuyor; katalogu düzeltin.",
          sectionCode: row.section,
          questionNumber: row.question,
          outcomeCode: outcome.code,
        });
      }
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
