import "server-only";
import type { Prisma } from "@prisma/client";
import type { NotificationPreferenceKey, NotificationRow } from "./panel-notifications";
import { produceNotification } from "./notification-producer";

/** Faz 3/4 çağrıları aynı kalıcı anahtarla merkezi üreticiye geçer. */
export async function queueReminderNotification(tx: Prisma.TransactionClient, row: NotificationRow & { id: string }, preferenceKey: NotificationPreferenceKey) {
  const prefix = `${row.userId}:`;
  if (!row.id.startsWith(prefix)) throw new Error("Notification recipient/key mismatch");
  const [sourceType, sourceId, ...category] = row.id.slice(prefix.length).split(":");
  if (!["LESSON", "COACHING", "PLAN"].includes(sourceType) || !sourceId || !category.length) throw new Error("Unsupported notification source");
  const { id: _id, ...content } = row;
  void _id;
  return produceNotification(tx, { ...content, sourceType: sourceType as "LESSON" | "COACHING" | "PLAN", sourceId, category: category.join(":") }, preferenceKey);
}
