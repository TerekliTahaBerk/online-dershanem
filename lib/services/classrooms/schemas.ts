import { z } from "zod";

export const classroomCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  branch: z.string().trim().max(120).optional().nullable(),
  level: z.enum(["MIXED", "TYT", "AYT", "LGS", "YDT"]).default("MIXED"),
  capacity: z.coerce.number().int().min(1).max(500).default(30),
  description: z.string().max(2000).optional().nullable(),
  isActive: z.boolean().default(true),
});
export type ClassroomCreateInput = z.infer<typeof classroomCreateSchema>;

export const classroomUpdateSchema = classroomCreateSchema.partial().extend({
  id: z.string().cuid(),
});
export type ClassroomUpdateInput = z.infer<typeof classroomUpdateSchema>;

export const classroomDeleteSchema = z.object({ id: z.string().cuid() });
