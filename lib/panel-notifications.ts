import "server-only";

import type { NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type NotificationRow = { userId: string; type: NotificationType; title: string; body: string; href?: string | null };
export type NotificationPreferenceKey = "lessonSummary" | "absence" | "assignment" | "payment";

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
