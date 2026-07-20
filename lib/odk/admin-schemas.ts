import { z } from "zod";

export const odkSlug = z.string().trim().toLowerCase().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Yalnız küçük harf, rakam ve tire kullanın.");
export const odkFamily = z.enum(["LGS", "TYT", "AYT"]);

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
  durationMinutes: z.number().int().min(5).max(360),
  questionCount: z.number().int().min(1).max(200),
});

export const updateExamScheduleSchema = z.object({
  title: z.string().trim().min(3).max(180),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  lateEntryMinutes: z.number().int().min(0).max(120),
  meetRequired: z.boolean(),
  meetUrl: z.string().trim().max(500).nullable(),
});

const question = z.object({
  id: z.string().min(1),
  correctOption: z.enum(["A", "B", "C", "D", "E"]).nullable(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  bookletPage: z.number().int().min(1).max(1000).nullable(),
  outcomeIds: z.array(z.string().min(1)).max(3),
  primaryOutcomeId: z.string().min(1).nullable(),
}).refine((value) => !value.primaryOutcomeId || value.outcomeIds.includes(value.primaryOutcomeId), { message: "Ana kazanım, bağlı kazanımlar içinde olmalıdır." });

export const updateQuestionsSchema = z.object({ questions: z.array(question).min(1).max(200) });
