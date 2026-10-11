import "server-only";

import type { NotificationType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { panelNotificationEmailContent, sendPanelNotificationEmail } from "@/lib/email";

export type NotificationRow = { userId: string; type: NotificationType; title: string; body: string; href?: string | null };
export type NotificationPreferenceKey = "lessonSummary" | "weeklyDigest" | "absence" | "assignment" | "payment" | "examUpdates";

/** Aynı kullanıcıya aynı içerik: tek satır. */
function dedupeNotificationRows(rows: NotificationRow[]): NotificationRow[] {
  return [...new Map(rows.map((row) => [`${row.userId}:${row.type}:${row.title}:${row.body}`, row])).values()];
}

/**
 * Kullanıcının panel ve kategori tercihlerini tüm bildirim üreticilerinde uygular.
 *
 * Tekilleştirme de burada: çağıran taraflar satırları alıcı listelerini
 * birleştirerek üretiyor ve aynı kişi birden çok yoldan listeye girebiliyor
 * (aynı gruptaki iki çocuğun velisi, hem öğretmen hem vekil öğretmen olan
 * kullanıcı). E-posta yolu zaten tekilleştiriyordu; uygulama içi bildirim
 * tekilleştirmiyordu ve kullanıcı aynı bildirimi iki kez görüyordu.
 */
export async function filterNotificationRows(rows: NotificationRow[], preferenceKey?: NotificationPreferenceKey, db: Pick<Prisma.TransactionClient, "notificationPreference"> = prisma): Promise<NotificationRow[]> {
  if (!rows.length) return [];
  rows = dedupeNotificationRows(rows);
  const userIds = [...new Set(rows.map((row) => row.userId))];
  const preferences = await db.notificationPreference.findMany({ where: { userId: { in: userIds } } });
  const byUser = new Map(preferences.map((item) => [item.userId, item]));
  return rows.filter((row) => {
    const preference = byUser.get(row.userId);
    if (!preference) return true;
    if (!preference.inAppEnabled) return false;
    return preferenceKey ? preference[preferenceKey] : true;
  });
}

/** E-posta izni açık kullanıcılar için panel bildirimini güvenli outbox'a yazar. */
export async function queuePanelNotificationEmails(rows: NotificationRow[], preferenceKey?: NotificationPreferenceKey, tx?: Prisma.TransactionClient): Promise<void> {
  if (!rows.length) return;
  const deduped = dedupeNotificationRows(rows);
  const userIds = [...new Set(deduped.map((row) => row.userId))];
  const users = await (tx ?? prisma).user.findMany({
    where: { id: { in: userIds }, status: "ACTIVE" },
    select: { id: true, email: true, fullName: true, notificationPrefs: true },
  });
  const byUser = new Map(users.map((user) => [user.id, user]));
  const deliveries = deduped.flatMap((row) => {
    const user = byUser.get(row.userId);
    const preference = user?.notificationPrefs;
    if (!user || !preference?.emailEnabled || (preferenceKey && !preference[preferenceKey])) return [];
    const input = { to: user.email, name: user.fullName, title: row.title, body: row.body, href: row.href };
    // İş değişikliğiyle aynı transaction: dış ağ çağrısı yok, cron outbox'ı dağıtır.
    return [tx ? tx.emailOutbox.create({ data: { recipients: JSON.stringify([user.email]), ...panelNotificationEmailContent(input) } }) : sendPanelNotificationEmail(input)];
  });
  if (deliveries.length) {
    if (tx) await Promise.all(deliveries);
    else await Promise.allSettled(deliveries);
  }
}
