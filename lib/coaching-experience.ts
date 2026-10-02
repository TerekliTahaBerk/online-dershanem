import { z } from "zod";
export const COACHING_RESCHEDULE_REASONS = {
  SCHOOL_SCHEDULE: "Ders veya okul saatim değişti",
  FAMILY_SCHEDULE: "Aile programımızla çakışıyor",
  TECH_ACCESS: "Katılım için teknik desteğe ihtiyacım var",
} as const;
const meetingUrl = z.string().trim().url().max(2000).refine((value) => new URL(value).protocol === "https:", "HTTPS bağlantısı gerekli.").nullable();
const common = { expectedVersion: z.number().int().min(1), idempotencyKey: z.string().min(8).max(100) };
export const coachingCreateSchema = z.object({ studentId: z.string().min(1), scheduledAt: z.string().datetime({ offset: true }), meetingUrl, idempotencyKey: common.idempotencyKey }).strict();
export const coachingMutationSchema = z.discriminatedUnion("action", [
  z.object({ ...common, action: z.literal("REQUEST"), reason: z.enum(["SCHOOL_SCHEDULE", "FAMILY_SCHEDULE", "TECH_ACCESS"]) }).strict(),
  z.object({ ...common, action: z.literal("SAVE"), scheduledAt: z.string().datetime({ offset: true }), meetingUrl }).strict(),
  z.object({ ...common, action: z.literal("ACCEPT") }).strict(),
  z.object({ ...common, action: z.literal("COMPLETE"), focus: z.string().trim().max(300), sharedNote: z.string().trim().max(4000), privateNote: z.string().trim().max(4000), decisions: z.array(z.object({ title: z.string().trim().min(2).max(160), scheduledFor: z.string().datetime({ offset: true }), durationMinutes: z.number().int().min(5).max(480) }).strict()).max(3) }).strict(),
]);
export type CoachingMutation = z.infer<typeof coachingMutationSchema>;
