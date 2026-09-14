import { z } from "zod";
import { lessonSeriesRequestSchema, previewLessonSeries, resolveLessonSeriesInput } from "./lesson-series-schedule";

export const lessonCreationSchema = lessonSeriesRequestSchema.extend({
  targetType: z.enum(["GROUP", "STUDENT"]).default("GROUP"), groupId: z.string().min(1).optional(), studentId: z.string().min(1).optional(),
  teacherId: z.string().min(1).optional(), title: z.string().trim().min(2).max(120), startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(), meetingUrl: z.string().url().max(500).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
}).superRefine((value, ctx) => {
  if (value.targetType === "GROUP" && !value.groupId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Grup seçin.", path: ["groupId"] });
  if (value.targetType === "STUDENT" && !value.studentId) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Öğrenci seçin.", path: ["studentId"] });
  if (value.mode === "SERIES" && !value.weekdays?.length && (value.repeatWeeks ?? 1) < 2 && !value.totalOccurrences) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Ders serisi için en az 2 hafta veya haftanın günlerini seçin.", path: ["repeatWeeks"] });
  }
});

export function resolveLessonCreationOccurrences(data: z.infer<typeof lessonCreationSchema>, durationMinutes: number) {
  const startsAt = new Date(data.startsAt);
  const useWeekdaySeries = data.mode === "SERIES" || (data.repeatWeeks ?? 1) > 1;
  if (!useWeekdaySeries) return { starts: [startsAt], ends: [new Date(startsAt.getTime() + durationMinutes * 60_000)] };
  const preview = previewLessonSeries(resolveLessonSeriesInput({ ...data, durationMinutes }));
  return { starts: preview.occurrences.map((item) => item.startsAt), ends: preview.occurrences.map((item) => item.endsAt) };
}
