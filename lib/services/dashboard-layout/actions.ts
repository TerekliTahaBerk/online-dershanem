"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";

const PanelEnum = z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]);

const itemSchema = z.object({
  key: z.string().min(1).max(80),
  visible: z.boolean(),
});

const saveSchema = z.object({
  panel: PanelEnum,
  items: z.array(itemSchema).min(0).max(64),
});

export const saveDashboardLayoutAction = defineAction({
  input: saveSchema,
  permission: "notifications.read.own",
  audit: { entityType: "DashboardLayout", action: "update", entityId: async ({ input }) => input.panel },
  async handler({ input, ctx }) {
    await prisma.dashboardLayout.upsert({
      where: { userId_panel: { userId: ctx.user.id, panel: input.panel } },
      update: { layout: { items: input.items } as never },
      create: {
        userId: ctx.user.id,
        panel: input.panel,
        layout: { items: input.items } as never,
      },
    });
    revalidatePath("/v2");
    return { ok: true };
  },
});

export const resetDashboardLayoutAction = defineAction({
  input: z.object({ panel: PanelEnum }),
  permission: "notifications.read.own",
  audit: { entityType: "DashboardLayout", action: "delete", entityId: async ({ input }) => input.panel },
  async handler({ input, ctx }) {
    await prisma.dashboardLayout.deleteMany({
      where: { userId: ctx.user.id, panel: input.panel },
    });
    revalidatePath("/v2");
    return { ok: true };
  },
});
