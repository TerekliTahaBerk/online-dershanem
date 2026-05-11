import { z } from "zod";

export const togglePermissionSchema = z.object({
  role: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]),
  permissionKey: z.string().min(1),
  granted: z.boolean(),
});

export const userOverrideSchema = z.object({
  userId: z.string().min(1),
  permissionKey: z.string().min(1),
  granted: z.boolean(),
  reason: z.string().max(500).optional(),
});

export const removeUserOverrideSchema = z.object({
  userId: z.string().min(1),
  permissionKey: z.string().min(1),
});
