import { z } from "zod";

export const packageCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(["COURSE", "EXAM"]).default("COURSE"),
  description: z.string().max(2000).optional().nullable(),
  price: z.coerce.number().int().min(0).max(1000000000),
  paytrLink: z.string().url().optional().nullable(),
  lessonCount: z.coerce.number().int().min(0).max(10000),
  subjects: z.string().trim().min(1).max(500),
  isActive: z.boolean().default(true),
});
export type PackageCreateInput = z.infer<typeof packageCreateSchema>;

export const packageUpdateSchema = packageCreateSchema.partial().extend({
  id: z.string().cuid(),
});
export type PackageUpdateInput = z.infer<typeof packageUpdateSchema>;

export const packageDeleteSchema = z.object({ id: z.string().cuid() });
