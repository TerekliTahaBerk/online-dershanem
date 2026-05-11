import { z } from "zod";

export const studentListFilterSchema = z.object({
  q: z.string().trim().optional(),
  status: z
    .array(z.enum(["NEW", "FOLLOW_UP", "ACTIVE", "AT_RISK", "COMPLETED", "INACTIVE"]))
    .optional(),
  classroomId: z.string().cuid().optional(),
  tagIds: z.array(z.string().cuid()).optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
  sort: z.enum(["createdAt", "updatedAt", "fullName", "status"]).default("updatedAt"),
  order: z.enum(["asc", "desc"]).default("desc")
});
export type StudentListFilter = z.infer<typeof studentListFilterSchema>;

export const studentCreateSchema = z.object({
  fullName: z.string().min(2).max(120),
  phone: z.string().min(7).max(32),
  email: z.string().email().optional().nullable(),
  classLevel: z.string().max(40).optional().nullable(),
  examType: z.string().max(20).optional().nullable(),
  city: z.string().max(60).optional().nullable(),
  district: z.string().max(60).optional().nullable(),
  schoolName: z.string().max(160).optional().nullable(),
  notes: z.string().max(2000).optional().nullable()
});
export type StudentCreateInput = z.infer<typeof studentCreateSchema>;

export const studentUpdateSchema = studentCreateSchema.partial().extend({
  id: z.string().cuid()
});
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;

export const studentDeleteSchema = z.object({
  id: z.string().cuid()
});
