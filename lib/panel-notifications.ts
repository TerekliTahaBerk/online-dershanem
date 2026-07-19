import "server-only";

import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendPanelNotificationEmail } from "@/lib/email";

export type NotificationRow = { userId: string; type: NotificationType; title: string; body: string; href?: string | null };
export type NotificationPreferenceKey = "lessonSummary" | "weeklyDigest" | "absence" | "assignment" | "payment";

/** Kullanıcının panel ve kategori tercihlerini tüm bildirim üreticilerinde uygular. */
export async function filterNotificationRows(rows: NotificationRow[], preferenceKey?: NotificationPreferenceKey): Promise<NotificationRow[]> {
  if (!rows.length) return [];
  const userIds = [...new Set(rows.map((row) => row.userId))];
  const preferences = await prisma.notificationPreference.findMany({ where: { userId: { in: userIds } } });
  const byUser = new Map(preferences.map((item) => [item.userId, item]));
  return rows.filter((row) => {
    const preference = byUser.get(row.userId);
    if (!preference) return true;
    if (!preference.inAppEnabled) return false;
    return preferenceKey ? preference[preferenceKey] : true;
  });
}

/** E-posta izni açık kullanıcılar için panel bildirimini güvenli outbox'a yazar. */
export async function queuePanelNotificationEmails(rows: NotificationRow[], preferenceKey?: NotificationPreferenceKey): Promise<void> {
  if (!rows.length) return;
  const deduped = [...new Map(rows.map((row) => [`${row.userId}:${row.type}:${row.title}:${row.body}`, row])).values()];
  const userIds = [...new Set(deduped.map((row) => row.userId))];
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, status: "ACTIVE" },
    select: { id: true, email: true, fullName: true, notificationPrefs: true },
  });
  const byUser = new Map(users.map((user) => [user.id, user]));
  const deliveries = deduped.flatMap((row) => {
    const user = byUser.get(row.userId);
    const preference = user?.notificationPrefs;
    if (!user || !preference?.emailEnabled || (preferenceKey && !preference[preferenceKey])) return [];
    return [sendPanelNotificationEmail({ to: user.email, name: user.fullName, title: row.title, body: row.body, href: row.href })];
  });
  if (deliveries.length) await Promise.allSettled(deliveries);
}
