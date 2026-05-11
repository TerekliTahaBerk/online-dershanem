import { prisma } from "@/lib/prisma";
import type { NotificationType, NotificationPriority } from "@prisma/client";
import { publish, publishMany } from "@/lib/realtime";
import { loadNotificationPrefs, loadPrefsMap } from "@/lib/services/notification-prefs/loader";
import { isChannelEnabled } from "@/lib/services/notification-prefs/types";
import { sendNotificationEmail } from "@/lib/email";

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
 *
 * Kullanıcının bildirim tercihleri kontrol edilir:
 * - inbox kapalıysa DB kaydı atlanır (URGENT bypass)
 * - toast kapalıysa realtime publish atlanır (URGENT bypass)
 */
export async function createNotification(input: CreateNotificationInput) {
  const type = input.type ?? "SYSTEM";
  const priority = input.priority ?? "NORMAL";
  const isUrgent = priority === "URGENT";
  const prefs = isUrgent ? null : await loadNotificationPrefs(input.userId);

  const wantInbox = isUrgent || isChannelEnabled(prefs, type, "inbox");
  const wantToast = isUrgent || isChannelEnabled(prefs, type, "toast");
  const wantEmail = isUrgent || isChannelEnabled(prefs, type, "email");

  if (wantEmail) {
    // Fire-and-forget — email outbox zaten retry-safe
    void sendNotificationEmailToUser(input.userId, {
      title: input.title,
      body: input.body,
      href: input.href,
      priority,
    });
  }

  if (!wantInbox && !wantToast) {
    return null;
  }

  if (!wantInbox) {
    // sadece toast — DB'ye yazma, ephemeral push
    publish(input.userId, {
      kind: "notification",
      payload: {
        id: "",
        type,
        priority,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        createdAt: new Date().toISOString(),
      },
    });
    return null;
  }

  const n = await prisma.notification.create({
    data: {
      userId: input.userId,
      type,
      priority,
      title: input.title,
      body: input.body,
      href: input.href,
    },
  });
  if (wantToast) {
    publish(input.userId, {
      kind: "notification",
      payload: {
        id: n.id,
        type: n.type,
        priority: n.priority,
        title: n.title,
        body: n.body,
        href: n.href,
        createdAt: n.createdAt.toISOString(),
      },
    });
  }
  return n;
}

/**
 * Fan-out to many users in one transaction.
 *
 * Her kullanıcı için tercih kontrolü yapılır. URGENT priority bypass.
 */
export async function broadcastNotification(
  userIds: string[],
  input: Omit<CreateNotificationInput, "userId">
) {
  if (userIds.length === 0) return { count: 0 };
  const type = input.type ?? "SYSTEM";
  const priority = input.priority ?? "NORMAL";
  const isUrgent = priority === "URGENT";

  const prefsMap = isUrgent ? {} : await loadPrefsMap(userIds);

  const inboxIds: string[] = [];
  const toastIds: string[] = [];
  const emailIds: string[] = [];
  for (const uid of userIds) {
    const prefs = prefsMap[uid] ?? null;
    if (isUrgent || isChannelEnabled(prefs, type, "inbox")) inboxIds.push(uid);
    if (isUrgent || isChannelEnabled(prefs, type, "toast")) toastIds.push(uid);
    if (isUrgent || isChannelEnabled(prefs, type, "email")) emailIds.push(uid);
  }

  if (emailIds.length > 0) {
    // Fire-and-forget bulk email
    void sendNotificationEmailsBulk(emailIds, {
      title: input.title,
      body: input.body,
      href: input.href,
      priority,
    });
  }

  let count = 0;
  if (inboxIds.length > 0) {
    const result = await prisma.notification.createMany({
      data: inboxIds.map((userId) => ({
        userId,
        type,
        priority,
        title: input.title,
        body: input.body,
        href: input.href,
      })),
    });
    count = result.count;
  }

  if (toastIds.length > 0) {
    publishMany(toastIds, {
      kind: "notification",
      payload: {
        id: "",
        type,
        priority,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        createdAt: new Date().toISOString(),
      },
    });
  }
  return { count };
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

// ─── Internal email helpers ─────────────────────────────────────────────────

type EmailPayload = {
  title: string;
  body: string;
  href?: string;
  priority: NotificationPriority;
};

async function sendNotificationEmailToUser(userId: string, payload: EmailPayload) {
  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!u?.email) return;
    await sendNotificationEmail({
      to: u.email,
      title: payload.title,
      body: payload.body,
      href: payload.href ?? null,
      priority: payload.priority,
    });
  } catch (err) {
    console.error("[notifications] email send failed:", err);
  }
}

async function sendNotificationEmailsBulk(userIds: string[], payload: EmailPayload) {
  try {
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { email: true },
    });
    const emails = users.map((u) => u.email).filter(Boolean) as string[];
    if (emails.length === 0) return;
    // Send sequentially with small delay batches to avoid Resend rate limits
    for (const to of emails) {
      await sendNotificationEmail({
        to,
        title: payload.title,
        body: payload.body,
        href: payload.href ?? null,
        priority: payload.priority,
      });
    }
  } catch (err) {
    console.error("[notifications] bulk email send failed:", err);
  }
}
