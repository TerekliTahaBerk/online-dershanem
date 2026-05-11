import { z } from "zod";

export const assignmentCreateSchema = z.object({
  teacherId: z.string().cuid(),
  classroomId: z.string().cuid().optional().nullable(),
  studentId: z.string().cuid().optional().nullable(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  subject: z.string().trim().max(120).optional().nullable(),
  dueAt: z.coerce.date().optional().nullable(),
  maxScore: z.coerce.number().int().min(0).max(1000).optional().nullable(),
  attachmentUrl: z.string().url().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED", "CLOSED"]).default("PUBLISHED"),
});
export type AssignmentCreateInput = z.infer<typeof assignmentCreateSchema>;

export const assignmentUpdateSchema = assignmentCreateSchema.partial().extend({
  id: z.string().cuid(),
});
export type AssignmentUpdateInput = z.infer<typeof assignmentUpdateSchema>;

export const assignmentDeleteSchema = z.object({ id: z.string().cuid() });
