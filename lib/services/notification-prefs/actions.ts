"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import {
  ALL_TYPES,
  ALL_CHANNELS,
  type NotificationPrefs,
} from "./types";
import { NOTIFICATION_PREFS_SCOPE, NOTIFICATION_PREFS_NAME } from "./loader";

const TypeEnum = z.enum(ALL_TYPES as [string, ...string[]]);
const ChannelEnum = z.enum(ALL_CHANNELS as [string, ...string[]]);

const prefsSchema = z.record(
  TypeEnum,
  z.record(ChannelEnum, z.boolean()),
);

export const saveNotificationPrefsAction = defineAction({
  input: z.object({ prefs: prefsSchema }),
  permission: "notifications.read.own",
  audit: { entityType: "NotificationPrefs", action: "update", entityId: async () => NOTIFICATION_PREFS_NAME },
  async handler({ input, ctx }) {
    const data = { prefs: input.prefs as NotificationPrefs };
    // SavedView reuse — composite scope+name+ownerId, idempotent upsert
    const existing = await prisma.savedView.findFirst({
      where: {
        ownerId: ctx.user.id,
        scope: NOTIFICATION_PREFS_SCOPE,
        name: NOTIFICATION_PREFS_NAME,
      },
      select: { id: true },
    });
    if (existing) {
      await prisma.savedView.update({
        where: { id: existing.id },
        data: { filter: data as never },
      });
    } else {
      await prisma.savedView.create({
        data: {
          ownerId: ctx.user.id,
          scope: NOTIFICATION_PREFS_SCOPE,
          name: NOTIFICATION_PREFS_NAME,
          filter: data as never,
          isShared: false,
        },
      });
    }
    revalidatePath("/v2");
    return { ok: true };
  },
});

export const resetNotificationPrefsAction = defineAction({
  input: z.object({}),
  permission: "notifications.read.own",
  audit: { entityType: "NotificationPrefs", action: "delete", entityId: async () => NOTIFICATION_PREFS_NAME },
  async handler({ ctx }) {
    await prisma.savedView.deleteMany({
      where: {
        ownerId: ctx.user.id,
        scope: NOTIFICATION_PREFS_SCOPE,
        name: NOTIFICATION_PREFS_NAME,
      },
    });
    revalidatePath("/v2");
    return { ok: true };
  },
});
