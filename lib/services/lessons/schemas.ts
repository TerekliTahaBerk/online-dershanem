import { z } from "zod";

export const lessonCreateSchema = z.object({
  studentId: z.string().cuid(),
  teacherId: z.string().cuid(),
  packageId: z.string().cuid().optional().nullable(),
  classroomId: z.string().cuid().optional().nullable(),
  title: z.string().trim().max(200).optional().nullable(),
  subject: z.string().trim().max(120).optional().nullable(),
  scheduledAt: z.coerce.date(),
  duration: z.coerce.number().int().min(5).max(600).default(60),
  googleMeetLink: z.string().url().optional().nullable(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).default("SCHEDULED"),
  notes: z.string().max(2000).optional().nullable(),
});
export type LessonCreateInput = z.infer<typeof lessonCreateSchema>;

export const lessonUpdateSchema = lessonCreateSchema.partial().extend({
  id: z.string().cuid(),
});
export type LessonUpdateInput = z.infer<typeof lessonUpdateSchema>;

export const lessonDeleteSchema = z.object({ id: z.string().cuid() });
