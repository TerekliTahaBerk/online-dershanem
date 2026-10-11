import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";

export type GroupNotificationInput = { userId: string; title: string; body: string; href?: string };

export async function notifyGroupAudience(rows: GroupNotificationInput[], tx?: Prisma.TransactionClient) {
  if (!rows.length) return;
  const raw = rows.map((row) => ({ ...row, type: "SYSTEM" as const }));
  const filtered = await filterNotificationRows(raw, undefined, tx);
  if (filtered.length) await (tx ?? prisma).notification.createMany({ data: filtered });
  await queuePanelNotificationEmails(raw, undefined, tx);
}
