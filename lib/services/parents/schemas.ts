import { z } from "zod";

export const parentCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().max(32).optional().nullable(),
  email: z.string().email().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});
export type ParentCreateInput = z.infer<typeof parentCreateSchema>;

export const parentUpdateSchema = parentCreateSchema.partial().extend({
  id: z.string().cuid(),
});
export type ParentUpdateInput = z.infer<typeof parentUpdateSchema>;

export const parentDeleteSchema = z.object({ id: z.string().cuid() });

export const parentLinkStudentSchema = z.object({
  parentId: z.string().cuid(),
  studentId: z.string().cuid(),
  relationship: z.string().trim().max(40).optional().nullable(),
  isPrimary: z.boolean().default(false),
});

export const parentUnlinkStudentSchema = z.object({
  parentId: z.string().cuid(),
  studentId: z.string().cuid(),
});
