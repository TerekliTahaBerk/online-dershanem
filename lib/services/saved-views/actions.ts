"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";

const SCOPES = z.enum([
  "students",
  "lessons",
  "assignments",
  "payments",
  "audit",
  "teacher.students",
  "teacher.lessons",
  "teacher.assignments",
  "parent.lessons",
  "parent.payments",
]);

const filterSchema = z.record(z.string(), z.union([z.string(), z.array(z.string())]));

const createSchema = z.object({
  scope: SCOPES,
  name: z.string().min(1).max(80),
  filter: filterSchema,
  isShared: z.boolean().default(false),
});

export const createSavedViewAction = defineAction({
  input: createSchema,
  permission: "notifications.read.own",
  audit: { entityType: "SavedView", action: "create", entityId: async ({ input }) => `${input.scope}:${input.name}` },
  async handler({ input, ctx }) {
    const v = await prisma.savedView.create({
      data: {
        ownerId: ctx.user.id,
        scope: input.scope,
        name: input.name,
        filter: input.filter as never,
        isShared: input.isShared,
      },
    });
    revalidatePath("/v2");
    return { id: v.id };
  },
});

const deleteSchema = z.object({ id: z.string().cuid() });

export const deleteSavedViewAction = defineAction({
  input: deleteSchema,
  permission: "notifications.read.own",
  audit: { entityType: "SavedView", action: "delete", entityId: async ({ input }) => input.id },
  async handler({ input, ctx }) {
    // Owner check — only delete your own (admin can delete anyone's)
    const existing = await prisma.savedView.findUnique({ where: { id: input.id } });
    if (!existing) return { ok: false };
    if (existing.ownerId !== ctx.user.id && ctx.user.role !== "ADMIN") {
      throw new Error("forbidden");
    }
    await prisma.savedView.delete({ where: { id: input.id } });
    revalidatePath("/v2");
    return { ok: true };
  },
});
