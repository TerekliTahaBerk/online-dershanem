import { z } from "zod";

export const odkSlug = z.string().trim().toLowerCase().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Yalnız küçük harf, rakam ve tire kullanın.");
export const odkFamily = z.enum(["LGS", "TYT", "AYT"]);
export const odkStructureMode = z.enum(["MATH_ONLY", "FULL_TEMPLATE"]);

export const createSeriesSchema = z.object({
  title: z.string().trim().min(3).max(140),
  slug: odkSlug,
  family: odkFamily,
  academicYear: z.number().int().min(2020).max(2100),
  classLevel: z.string().trim().max(40).optional().or(z.literal("")),
});

export const createExamSchema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: odkSlug,
  family: odkFamily,
  seriesId: z.string().min(1).optional().nullable(),
  durationMinutes: z.number().int().min(5).max(360).optional(),
  questionCount: z.number().int().min(1).max(200).optional(),
  structureMode: odkStructureMode.optional(),
  templateCode: z.string().trim().min(3).max(40).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  internalCode: z.string().trim().max(64).optional().nullable(),
  academicYear: z.number().int().min(2020).max(2100).optional().nullable(),
  publisher: z.string().trim().max(120).optional().nullable(),
}).transform((value) => ({
  ...value,
  structureMode: value.structureMode
    ?? (value.templateCode?.endsWith("_MATH") ? "MATH_ONLY" as const : value.templateCode?.endsWith("_FULL") ? "FULL_TEMPLATE" as const : value.questionCount != null ? "MATH_ONLY" as const : "FULL_TEMPLATE" as const),
}));

export const updateExamScheduleSchema = z.object({
  title: z.string().trim().min(3).max(180),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  lateEntryMinutes: z.number().int().min(0).max(120),
  meetRequired: z.boolean(),
  meetUrl: z.string().trim().max(500).nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  internalCode: z.string().trim().max(64).optional().nullable(),
});

const question = z.object({
  id: z.string().min(1),
  correctOption: z.enum(["A", "B", "C", "D", "E"]).nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  bookletPage: z.number().int().min(1).max(1000).nullable(),
  assetUrl: z.string().url().nullable().optional(),
  outcomeIds: z.array(z.string().min(1)).max(3),
  primaryOutcomeId: z.string().min(1).nullable(),
}).refine((value) => !value.primaryOutcomeId || value.outcomeIds.includes(value.primaryOutcomeId), { message: "Ana kazanım, bağlı kazanımlar içinde olmalıdır." });

export const updateQuestionsSchema = z.object({ questions: z.array(question).min(1).max(200) });

export const jsonImportPreviewSchema = z.object({
  payload: z.unknown(),
});

export const jsonImportCommitSchema = z.object({
  importId: z.string().min(1),
});

export const assignmentCreateSchema = z.object({
  studentUserIds: z.array(z.string().min(1)).max(500).optional(),
  groupId: z.string().min(1).optional(),
  classId: z.string().min(1).optional(),
  cohortId: z.string().min(1).optional(),
  source: z.enum(["STUDENT", "GROUP", "CLASS", "COHORT", "BULK"]).default("STUDENT"),
}).refine((value) => Boolean(value.studentUserIds?.length || value.groupId || value.classId || value.cohortId), {
  message: "En az bir öğrenci, grup, sınıf veya cohort seçilmelidir.",
});

export const examEventBatchSchema = z.object({
  events: z.array(z.object({
    type: z.string().min(1).max(40),
    sequence: z.number().int().positive(),
    clientOccurredAt: z.string().datetime().optional().nullable(),
    questionId: z.string().min(1).optional().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  })).min(1).max(50),
});

export const questionTimingBatchSchema = z.object({
  timings: z.array(z.object({
    questionId: z.string().min(1),
    activeDurationMs: z.number().int().min(0).max(30 * 60_000),
    enteredAt: z.string().datetime().optional(),
    leftAt: z.string().datetime().optional(),
  })).min(1).max(40),
});

export const releasePreviewSchema = z.object({
  excludeReviewRequired: z.boolean().optional(),
});

export const rescoreSchema = z.object({
  confirmPublishedChange: z.boolean().optional(),
  reason: z.string().trim().min(3).max(500).optional(),
});
