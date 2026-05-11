import { prisma } from "@/lib/prisma";
import type { NotificationType, NotificationPriority } from "@prisma/client";

export type CreateNotificationInput = {
  userId: string;
  type?: NotificationType;
  priority?: NotificationPriority;
  title: string;
  body: string;
  href?: string;
};

/**
 * Create a notification for a single user.
 */
export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type ?? "SYSTEM",
      priority: input.priority ?? "NORMAL",
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
}

/**
 * Fan-out to many users in one transaction.
 */
export async function broadcastNotification(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">
) {
  if (userIds.length === 0) return { count: 0 };
  return prisma.notification.createMany({
    data: userIds.map((userId) => ({
      userId,
      type: input.type ?? "SYSTEM",
      priority: input.priority ?? "NORMAL",
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  });
}

/**
 * Mark notification(s) as read. If `ids` empty, marks all for user.
 */
export async function markRead(userId: string, ids?: string[]) {
  if (ids && ids.length > 0) {
    return prisma.notification.updateMany({
      where: { userId, id: { in: ids }, readAt: null },
      data: { readAt: new Date() },
    });
  }
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function listForUser(
  userId: string,
  opts: { take?: number; onlyUnread?: boolean } = {}
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(opts.onlyUnread ? { readAt: null } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.take ?? 30,
  });
}

export async function countUnread(userId: string) {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

/**
 * Given a list of studentIds, returns userIds of all linked parents.
 * Used to fan-out parent notifications alongside student notifications.
 */
export async function parentUserIdsForStudents(studentIds: string[]): Promise<string[]> {
  if (studentIds.length === 0) return [];
  const links = await prisma.parentStudent.findMany({
    where: { studentId: { in: studentIds } },
    select: { parent: { select: { userId: true } } },
  });
  const ids = new Set<string>();
  for (const l of links) {
    if (l.parent.userId) ids.add(l.parent.userId);
  }
  return Array.from(ids);
}
