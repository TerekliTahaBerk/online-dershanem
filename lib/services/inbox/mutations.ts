"use server";

import { prisma } from "@/lib/prisma";
import { defineAction } from "@/lib/rbac/define-action";
import { inboxBroadcastSchema, inboxIdsSchema } from "./schemas";
import { revalidatePath } from "next/cache";

export const markInboxRead = defineAction({
  input: inboxIdsSchema,
  permission: "inbox.read.own",
  audit: { entityType: "InboxMessage", action: "read" },
  async handler({ input, ctx }) {
    const res = await prisma.inboxMessage.updateMany({
      where: { id: { in: input.ids }, recipientUserId: ctx.user.id, readAt: null },
      data: { readAt: new Date() },
    });
    revalidatePath("/v2/admin/inbox");
    return { count: res.count };
  },
});

export const archiveInbox = defineAction({
  input: inboxIdsSchema,
  permission: "inbox.read.own",
  audit: { entityType: "InboxMessage", action: "archive" },
  async handler({ input, ctx }) {
    const res = await prisma.inboxMessage.updateMany({
      where: { id: { in: input.ids }, recipientUserId: ctx.user.id, archivedAt: null },
      data: { archivedAt: new Date() },
    });
    revalidatePath("/v2/admin/inbox");
    return { count: res.count };
  },
});

export const unarchiveInbox = defineAction({
  input: inboxIdsSchema,
  permission: "inbox.read.own",
  audit: { entityType: "InboxMessage", action: "unarchive" },
  async handler({ input, ctx }) {
    const res = await prisma.inboxMessage.updateMany({
      where: { id: { in: input.ids }, recipientUserId: ctx.user.id },
      data: { archivedAt: null },
    });
    revalidatePath("/v2/admin/inbox");
    return { count: res.count };
  },
});

export const deleteInbox = defineAction({
  input: inboxIdsSchema,
  permission: "inbox.read.own",
  audit: { entityType: "InboxMessage", action: "delete" },
  async handler({ input, ctx }) {
    const res = await prisma.inboxMessage.deleteMany({
      where: { id: { in: input.ids }, recipientUserId: ctx.user.id },
    });
    revalidatePath("/v2/admin/inbox");
    return { count: res.count };
  },
});

export const broadcastInbox = defineAction({
  input: inboxBroadcastSchema,
  permission: "inbox.write.broadcast",
  audit: { entityType: "InboxMessage", action: "broadcast" },
  async handler({ input, ctx }) {
    const recipients = await prisma.user.findMany({
      where:
        input.recipientRole === "ALL" ? {} : { role: input.recipientRole as any },
      select: { id: true },
    });

    if (recipients.length === 0) return { count: 0 };

    const res = await prisma.inboxMessage.createMany({
      data: recipients.map((u) => ({
        recipientUserId: u.id,
        category: input.category,
        priority: input.priority,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        createdById: ctx.user.id,
      })),
    });

    revalidatePath("/v2/admin/inbox");
    return { count: res.count };
  },
});
