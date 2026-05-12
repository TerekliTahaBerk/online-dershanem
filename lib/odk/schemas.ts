import { z } from "zod";

/**
 * ODK domain zod schemaları + tipleri.
 *
 * - Admin tarafı: deneme oluşturma, JSON ingestion (cevap anahtarı + kazanım)
 * - Öğrenci tarafı: cevap işaretleme, event push (Faz 3+)
 */

export const EXAM_FAMILIES = ["TYT", "AYT", "LGS", "KPSS", "ALES"] as const;
export const ANSWER_OPTIONS = ["A", "B", "C", "D", "E"] as const;
export const DIFFICULTY = ["easy", "medium", "hard"] as const;

// ─── Cevap Anahtarı JSON ───────────────────────────────────────────────

export const AnswerKeyItem = z.object({
  questionNumber: z.number().int().positive(),
  correctAnswer: z.enum(ANSWER_OPTIONS),
  subject: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1).optional(),
  learningOutcome: z.string().trim().min(1).optional(),
});
export type AnswerKeyItem = z.infer<typeof AnswerKeyItem>;
export const AnswerKey = z.array(AnswerKeyItem).min(1);
export type AnswerKey = z.infer<typeof AnswerKey>;

// ─── Soru / Kazanım JSON ───────────────────────────────────────────────

export const LearningOutcomeItem = z.object({
  questionNumber: z.number().int().positive(),
  examType: z.enum(EXAM_FAMILIES),
  lesson: z.string().trim().min(1),
  unit: z.string().trim().min(1).optional(),
  topic: z.string().trim().min(1).optional(),
  learningOutcomeCode: z.string().trim().min(1),
  learningOutcome: z.string().trim().min(1),
  difficulty: z.enum(DIFFICULTY).optional(),
});
export type LearningOutcomeItem = z.infer<typeof LearningOutcomeItem>;
export const LearningOutcomeList = z.array(LearningOutcomeItem).min(1);
export type LearningOutcomeList = z.infer<typeof LearningOutcomeList>;

// ─── Exam settings ─────────────────────────────────────────────────────

export const ExamSettings = z.object({
  showResultImmediately: z.boolean().default(true),
  showAnswerKeyImmediately: z.boolean().default(false),
  allowReview: z.boolean().default(true),
  fullscreenRequired: z.boolean().default(false),
  blockCopyPaste: z.boolean().default(true),
  autoSubmitOnFullscreenExit: z.boolean().default(false),
  warnOnViolation: z.boolean().default(true),
});
export type ExamSettings = z.infer<typeof ExamSettings>;

export const DEFAULT_EXAM_SETTINGS: ExamSettings = {
  showResultImmediately: true,
  showAnswerKeyImmediately: false,
  allowReview: true,
  fullscreenRequired: false,
  blockCopyPaste: true,
  autoSubmitOnFullscreenExit: false,
  warnOnViolation: true,
};

// ─── Section definition (admin wizard) ─────────────────────────────────

export const ExamSectionInput = z.object({
  title: z.string().trim().min(1).max(80),
  questionCount: z.number().int().positive().max(200),
});
export type ExamSectionInput = z.infer<typeof ExamSectionInput>;

// ─── Exam create/update payload ────────────────────────────────────────

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ExamCreateInput = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().toLowerCase().regex(slugRegex, "Slug yalnızca a-z, 0-9 ve tire içerebilir.").max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  cadenceFamily: z.enum(EXAM_FAMILIES),
  classLevel: z.string().trim().max(40).optional().nullable(),
  durationMinutes: z.number().int().min(5).max(360).default(120),
  startsAt: z.coerce.date().optional().nullable(),
  endsAt: z.coerce.date().optional().nullable(),
  sections: z.array(ExamSectionInput).min(1).max(8),
  settings: ExamSettings.partial().optional(),
});
export type ExamCreateInput = z.infer<typeof ExamCreateInput>;

export const ExamUpdateInput = ExamCreateInput.partial().extend({
  // Sections sadece dışarıdan yeniden gönderildiğinde değiştirilir; aksi
  // halde mevcut kayıtlar korunur.
  sections: z.array(ExamSectionInput).min(1).max(8).optional(),
});
export type ExamUpdateInput = z.infer<typeof ExamUpdateInput>;

// ─── Publish gate ──────────────────────────────────────────────────────

export const ExamPublishInput = z.object({
  publishedAt: z.coerce.date().optional(),
});
export type ExamPublishInput = z.infer<typeof ExamPublishInput>;

// ─── JSON ingestion request ────────────────────────────────────────────

export const JsonIngestRequest = z.object({
  payload: z.unknown(), // alt parser ayrı çalıştırılır (AnswerKey ya da LearningOutcomeList)
});

// ─── Access tag bağlama ────────────────────────────────────────────────

export const ExamAccessTagsInput = z.object({
  tagIds: z.array(z.string().min(1)).min(1).max(20),
});
export type ExamAccessTagsInput = z.infer<typeof ExamAccessTagsInput>;
