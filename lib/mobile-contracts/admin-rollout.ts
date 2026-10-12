import { check, v, type Infer } from "./validate";

/**
 * P2.8 kalanlar — KONTROLLÜ YAYIN (PİLOT, Y25) ve DIŞ DENEMELER (Y18).
 * Okumalar `GET /api/panel/admin/pilot` ve `GET /api/panel/admin/mock-exams`;
 * yazmalar web ile AYNI `pilot-cohorts*` ve `mock-exams*` uçları (taze
 * step-up, işlem anahtarı, sürüm / revizyon 409).
 */

const tone = v.oneOf(["neutral", "info", "success", "warning", "critical"] as const);

export const PILOT_ACTIONS = ["ACTIVATE", "PAUSE", "RESUME", "COMPLETE", "ROLLBACK"] as const;
export type PilotActionCode = (typeof PILOT_ACTIONS)[number];

const pilot = v.object({
  contractVersion: v.literal(1),
  meta: v.string(),
  readiness: v.object({
    canActivate: v.boolean(),
    canExpand: v.boolean(),
    checks: v.array(v.object({ key: v.nonEmpty(), label: v.string(), status: v.oneOf(["PASS", "BLOCK", "WAIT"] as const), statusLabel: v.string(), detail: v.string() })),
  }),
  groups: v.array(v.object({ id: v.nonEmpty(), name: v.string(), detail: v.string() })),
  stopReasons: v.array(v.object({ value: v.nonEmpty(), label: v.string() })),
  cohorts: v.array(
    v.object({
      id: v.nonEmpty(),
      groupName: v.string(),
      status: v.oneOf(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ROLLED_BACK"] as const),
      statusLabel: v.string(),
      tone,
      version: v.int(1),
      memberCount: v.int(0),
      coverage: v.object({ ADMIN: v.int(0), TEACHER: v.int(0), STUDENT: v.int(0), PARENT: v.int(0) }),
      createdAt: v.iso(),
      actions: v.array(v.object({ action: v.oneOf(PILOT_ACTIONS), label: v.string(), destructive: v.boolean(), needsReason: v.boolean() })),
    }),
  ),
});
export type MobilePilot = Infer<typeof pilot>;
export const parsePilot = (input: unknown) => check(pilot, input);

const pilotResult = v.object({ cohort: v.object({ id: v.nonEmpty(), status: v.string(), version: v.int(1) }) });
export const parsePilotResult = (input: unknown) => check(pilotResult, input);

/* ------------------------------------------------------------------ *
 * Dış deneme toplu yapıştırma — web giriş formu ve mobil ekran AYNI saf
 * ayrıştırıcıyı kullanır. Her satır: doğru, yanlış, boş[, süre]
 * (sekme / noktalı virgül / virgül / boşlukla ayrılmış).
 * ------------------------------------------------------------------ */

export type MockExamPasteRow = { correctCount: number; incorrectCount: number; blankCount: number; durationMinutes: number };
export type MockExamPasteResult = { ok: true; rows: MockExamPasteRow[] } | { ok: false; reason: "ROW_COUNT" | "FORMAT" | "TOTAL_MISMATCH"; message: string };

export function parseMockExamPaste(text: string, questionCounts: number[]): MockExamPasteResult {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length !== questionCounts.length) return { ok: false, reason: "ROW_COUNT", message: `${questionCounts.length} satır bekleniyor.` };
  const parsed = lines.map((line) => line.trim().split(/[\t;, ]+/).map(Number));
  if (parsed.some((values) => values.length < 3 || values.length > 4 || values.some((value) => !Number.isInteger(value) || value < 0))) return { ok: false, reason: "FORMAT", message: "Her satırda 3 veya 4 negatif olmayan tam sayı olmalı." };
  if (parsed.some((values, index) => values[0] + values[1] + values[2] !== questionCounts[index])) return { ok: false, reason: "TOTAL_MISMATCH", message: "Yapıştırılan satırlardan birinin soru toplamı şablonla eşleşmiyor." };
  return { ok: true, rows: parsed.map((values) => ({ correctCount: values[0], incorrectCount: values[1], blankCount: values[2], durationMinutes: values[3] || 0 })) };
}

/* ------------------------------------------------------------------ *
 * DIŞ DENEMELER — `GET /api/panel/admin/mock-exams?ogrenci=<profilId>`.
 * ------------------------------------------------------------------ */

export const MOCK_EXAM_ERROR_CATEGORIES = ["KNOWLEDGE", "PROCESS", "ATTENTION", "TIME", "BLANK"] as const;
export type MockExamErrorCode = (typeof MOCK_EXAM_ERROR_CATEGORIES)[number];
export const MOCK_EXAM_TYPES = ["LGS", "TYT", "AYT", "YDT"] as const;
export type MockExamTypeCode = (typeof MOCK_EXAM_TYPES)[number];
/** Web ile aynı sınır: bir denemede en fazla üç hata nedeni. */
export const MOCK_EXAM_MAX_REASONS = 3;

const category = v.oneOf(MOCK_EXAM_ERROR_CATEGORIES);
const mockExams = v.object({
  contractVersion: v.literal(1),
  templates: v.array(v.object({ exam: v.oneOf(MOCK_EXAM_TYPES), label: v.string(), defaultDuration: v.int(1), sections: v.array(v.object({ code: v.nonEmpty(), name: v.string(), questions: v.int(1) })) })),
  errorCategories: v.array(v.object({ value: category, label: v.string() })),
  students: v.array(v.object({ id: v.nonEmpty(), name: v.string() })),
  studentId: v.nullable(v.string()),
  exams: v.array(
    v.object({
      id: v.nonEmpty(),
      exam: v.oneOf(MOCK_EXAM_TYPES),
      title: v.string(),
      publisher: v.string(),
      takenAt: v.iso(),
      durationMinutes: v.nullable(v.int(0)),
      nextAction: v.nullable(v.string()),
      net: v.number(),
      correct: v.int(0),
      incorrect: v.int(0),
      blank: v.int(0),
      revision: v.nonEmpty(),
      sections: v.array(v.object({ id: v.nonEmpty(), subjectName: v.string(), correct: v.int(0), incorrect: v.int(0), blank: v.int(0), net: v.number(), errors: v.array(category) })),
    }),
  ),
  trend: v.object({
    heatmap: v.array(v.object({ key: v.nonEmpty(), subject: v.string(), counts: v.array(v.int(0)) })),
    recurring: v.nullable(v.object({ category, label: v.string(), count: v.int(1), action: v.string() })),
  }),
  approval: v.nullable(v.object({ examId: v.nonEmpty(), action: v.string() })),
});
export type MobileMockExams = Infer<typeof mockExams>;
export const parseMockExamsAdmin = (input: unknown) => check(mockExams, input);
