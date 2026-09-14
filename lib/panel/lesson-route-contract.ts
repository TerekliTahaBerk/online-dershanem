import { z } from "zod";
import { LessonLifecycleError, type LessonScope } from "./lesson-lifecycle";

const scope = z.enum(["ONE", "FOLLOWING"]).default("ONE");
export const lessonUpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("UPDATE"), scope, title: z.string().trim().min(2).max(120).optional(), startsAt: z.string().datetime().optional(), status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]).optional(), meetingUrl: z.string().url().max(500).optional().or(z.literal("")) }),
  z.object({ action: z.literal("RESCHEDULE"), scope, startsAt: z.string().datetime(), keepDurationMinutes: z.number().int().min(15).max(240).optional() }),
  z.object({ action: z.literal("CANCEL"), scope }),
  z.object({ action: z.literal("SUBSTITUTE"), scope, teacherId: z.string().min(1) }),
  z.object({ action: z.literal("MAKE_UP"), startsAt: z.string().datetime(), teacherId: z.string().min(1).optional(), title: z.string().trim().min(2).max(120).optional(), meetingUrl: z.string().url().max(500).optional().or(z.literal("")) }),
]);
export const legacyLessonUpdateSchema = z.object({ title: z.string().trim().min(2).max(120), startsAt: z.string().datetime(), status: z.enum(["PLANNED", "COMPLETED", "CANCELLED"]), meetingUrl: z.string().url().max(500).optional().or(z.literal("")) });

export function lessonScopeLabel(value: LessonScope) {
  return value === "FOLLOWING" ? "bu ve sonraki dersler" : "sadece bu ders";
}

export function lessonLifecycleHttpError(error: unknown): { status: number; message: string } | null {
  if (!(error instanceof LessonLifecycleError)) return null;
  if (error.code === "LESSON_NOT_FOUND") return { status: 404, message: error.message };
  if (error.code === "SCOPE_NOT_AVAILABLE" || error.code === "SCHEDULE_CONFLICT") return { status: 409, message: error.message };
  if (error.code === "TEACHER_NOT_FOUND") return { status: 400, message: error.message };
  return { status: 400, message: "Ders işlemi tamamlanamadı." };
}
