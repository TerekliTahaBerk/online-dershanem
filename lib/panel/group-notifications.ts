import { prisma } from "@/lib/prisma";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";

export type GroupNotificationInput = { userId: string; title: string; body: string; href?: string };

export async function notifyGroupAudience(rows: GroupNotificationInput[]) {
  if (!rows.length) return;
  const raw = rows.map((row) => ({ ...row, type: "SYSTEM" as const }));
  const filtered = await filterNotificationRows(raw);
  if (filtered.length) await prisma.notification.createMany({ data: filtered });
  await queuePanelNotificationEmails(raw);
}
