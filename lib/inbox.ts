import { prisma } from "@/lib/prisma";
import type { InboxCategory, InboxPriority } from "@prisma/client";

/**
 * Inbox sistemi — tüm panel olayları (ödeme, ödev, yoklama, duyuru, …)
 * bu adapter üzerinden mesaj yazar. Gelecekte SSE/WebSocket/Push ile
 * değiştirilebilir; çağıranlar sadece publishInboxMessage'i bilir.
 */

export type PublishInboxInput = {
  recipientUserId: string;
  category?: InboxCategory;
  priority?: InboxPriority;
  title: string;
  body: string;
  href?: string | null;
  relatedEntityType?: string | null;
  relatedEntityId?: string | null;
  createdById?: string | null;
};

export async function publishInboxMessage(input: PublishInboxInput) {
  return prisma.inboxMessage.create({
    data: {
      recipientUserId: input.recipientUserId,
      category: input.category ?? "SYSTEM",
      priority: input.priority ?? "NORMAL",
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

/** Bir defada birden fazla alıcıya aynı mesaj (duyuru / broadcast). */
export async function publishInboxBroadcast(
  recipientUserIds: string[],
  payload: Omit<PublishInboxInput, "recipientUserId">,
) {
  if (recipientUserIds.length === 0) return { count: 0 };
  // createMany — Postgres'te hızlı bulk insert.
  return prisma.inboxMessage.createMany({
    data: recipientUserIds.map((uid) => ({
      recipientUserId: uid,
      category: payload.category ?? "ANNOUNCEMENT",
      priority: payload.priority ?? "NORMAL",
      title: payload.title,
      body: payload.body,
      href: payload.href ?? null,
      relatedEntityType: payload.relatedEntityType ?? null,
      relatedEntityId: payload.relatedEntityId ?? null,
      createdById: payload.createdById ?? null,
    })),
  });
}

/** Okunmamış sayısı (sidebar bell rozeti için). */
export async function getUnreadCount(userId: string) {
  return prisma.inboxMessage.count({
    where: { recipientUserId: userId, readAt: null, archivedAt: null },
  });
}

export type InboxListFilter = {
  category?: InboxCategory;
  unreadOnly?: boolean;
  archived?: boolean;
};

export async function listInboxMessages(
  userId: string,
  filter: InboxListFilter = {},
  options: { take?: number; skip?: number } = {},
) {
  const where = {
    recipientUserId: userId,
    ...(filter.category ? { category: filter.category } : {}),
    ...(filter.unreadOnly ? { readAt: null } : {}),
    archivedAt: filter.archived ? { not: null } : null,
  };
  const [items, total, unread] = await Promise.all([
    prisma.inboxMessage.findMany({
      where,
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: options.take ?? 50,
      skip: options.skip ?? 0,
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
      },
    }),
    prisma.inboxMessage.count({ where }),
    prisma.inboxMessage.count({
      where: { recipientUserId: userId, readAt: null, archivedAt: null },
    }),
  ]);
  return { items, total, unread };
}

export async function markRead(userId: string, ids: string[]) {
  if (ids.length === 0) return { count: 0 };
  return prisma.inboxMessage.updateMany({
    where: { id: { in: ids }, recipientUserId: userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string) {
  return prisma.inboxMessage.updateMany({
    where: { recipientUserId: userId, readAt: null, archivedAt: null },
    data: { readAt: new Date() },
  });
}

export async function archiveMessages(userId: string, ids: string[]) {
  if (ids.length === 0) return { count: 0 };
  return prisma.inboxMessage.updateMany({
    where: { id: { in: ids }, recipientUserId: userId, archivedAt: null },
    data: { archivedAt: new Date() },
  });
}

export async function unarchiveMessages(userId: string, ids: string[]) {
  if (ids.length === 0) return { count: 0 };
  return prisma.inboxMessage.updateMany({
    where: { id: { in: ids }, recipientUserId: userId, archivedAt: { not: null } },
    data: { archivedAt: null },
  });
}

/** Kategori sayaç özeti (sidebar/filtre rozetleri için). */
export async function getCategoryCounts(userId: string) {
  const grouped = await prisma.inboxMessage.groupBy({
    by: ["category"],
    where: { recipientUserId: userId, readAt: null, archivedAt: null },
    _count: { _all: true },
  });
  const map: Record<string, number> = {};
  for (const g of grouped) map[g.category] = g._count._all;
  return map;
}
