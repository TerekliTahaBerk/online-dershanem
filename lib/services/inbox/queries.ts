import { prisma } from "@/lib/prisma";
import type { InboxListFilter } from "./schemas";

export async function listInboxMessages(filter: InboxListFilter, viewerUserId: string, isAdmin: boolean) {
  const recipientUserId =
    isAdmin && filter.recipientUserId ? filter.recipientUserId : viewerUserId;

  const where: any = {
    recipientUserId,
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.priority ? { priority: filter.priority } : {}),
    ...(filter.search
      ? {
          OR: [
            { title: { contains: filter.search, mode: "insensitive" } },
            { body: { contains: filter.search, mode: "insensitive" } },
          ],
        }
      : {}),
    archivedAt: filter.archived ? { not: null } : null,
    ...(filter.unreadOnly ? { readAt: null } : {}),
  };

  const [items, total, unread] = await Promise.all([
    prisma.inboxMessage.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: filter.take,
      skip: filter.skip,
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.inboxMessage.count({ where }),
    prisma.inboxMessage.count({
      where: { recipientUserId, readAt: null, archivedAt: null },
    }),
  ]);

  return { items, total, unread };
}

export async function getInboxMessage(id: string, viewerUserId: string, isAdmin: boolean) {
  const msg = await prisma.inboxMessage.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true, role: true } },
      recipient: { select: { id: true, name: true, email: true, role: true } },
    },
  });
  if (!msg) return null;
  if (!isAdmin && msg.recipientUserId !== viewerUserId) return null;
  return msg;
}
