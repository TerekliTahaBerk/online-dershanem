import "server-only";
import type { Prisma } from "@prisma/client";
import type { NotificationPreferenceKey, NotificationRow } from "@/lib/panel-notifications";
import { queueCustomerInformationEmail } from "@/lib/email";

/** Panel ve e-posta kanalları ayrı tercihlere, aynı kalıcı olay kimliğine uyar. */
export async function queueReminderNotification(tx: Prisma.TransactionClient, row: NotificationRow & { id: string }, category: NotificationPreferenceKey) {
  const user = await tx.user.findFirst({ where: { id: row.userId, status: "ACTIVE" }, select: { email: true, notificationPrefs: true } });
  if (!user) return 0;
  const preference = user.notificationPrefs;
  if (preference && !preference[category]) return 0;
  const result = !preference || preference.inAppEnabled
    ? await tx.notification.createMany({ data: [row], skipDuplicates: true }) : { count: 0 };
  if (preference?.emailEnabled) {
    await queueCustomerInformationEmail({ id: `reminder-email:${row.id}`, to: user.email, title: row.title, body: row.body }, tx);
  }
  return result.count;
}
