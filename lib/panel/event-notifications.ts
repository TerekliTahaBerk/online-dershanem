import "server-only";

import type { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { filterNotificationRows, queuePanelNotificationEmails, type NotificationPreferenceKey, type NotificationRow } from "@/lib/panel-notifications";

/**
 * Olay bildirimleri için ortak teslim: kararlı kimlik, tercih filtresi,
 * uygulama içi satır ve e-posta outbox'ı. Aynı olay (aynı kimlik) ikinci kez
 * ne uygulama içine ne e-postaya düşer.
 */

export type EventNotificationDb = PrismaClient | Prisma.TransactionClient;
export type EventNotificationRow = NotificationRow & { id: string; category: string; sourceType?: string | null; sourceId?: string | null; preferenceKey?: string | null };

export function eventNotificationId(prefix: string, userId: string, event: string) {
  return `${prefix}:${createHash("sha256").update(`${userId}:${event}`).digest("hex").slice(0, 40)}`;
}

export async function deliverEventNotifications(db: EventNotificationDb, rows: EventNotificationRow[], preferenceKey: NotificationPreferenceKey) {
  if (!rows.length) return 0;
  const seen = new Set((await db.notification.findMany({ where: { id: { in: rows.map((item) => item.id) } }, select: { id: true } })).map((item) => item.id));
  const fresh = [...new Map(rows.filter((item) => !seen.has(item.id)).map((item) => [item.id, item])).values()];
  if (!fresh.length) return 0;
  const visible = await filterNotificationRows(fresh, preferenceKey, db);
  const created = visible.length ? (await db.notification.createMany({ data: visible.map((item) => ({ ...item, preferenceKey })), skipDuplicates: true })).count : 0;
  // E-posta outbox'a yazılır; dış ağ çağrısını cron yapar.
  await queuePanelNotificationEmails(fresh, preferenceKey, db as Prisma.TransactionClient);
  return created;
}
