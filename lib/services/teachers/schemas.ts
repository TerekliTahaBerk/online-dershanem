import { z } from "zod";

export const teacherCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  subjects: z.string().trim().min(1).max(200),
  bio: z.string().max(2000).optional().nullable(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});
export type TeacherCreateInput = z.infer<typeof teacherCreateSchema>;

export const teacherUpdateSchema = teacherCreateSchema.partial().extend({
  id: z.string().cuid(),
});
export type TeacherUpdateInput = z.infer<typeof teacherUpdateSchema>;

export const teacherDeleteSchema = z.object({ id: z.string().cuid() });
