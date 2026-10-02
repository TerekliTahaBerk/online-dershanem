import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { queueCustomerInformationEmail } from "./email";
import type { NotificationRow, NotificationPreferenceKey } from "./panel-notifications";
import { notificationDeliveryAt, afterQuietHours, notificationKey } from "./notification-delivery";
import { formatIstanbulDateInput } from "./istanbul-time";
import { getPanelFeatureFlags } from "./panel-feature-flags";

type SourceType = "LESSON" | "COACHING" | "PLAN";
export type NotificationIntent = NotificationRow & { sourceType: SourceType; sourceId: string; category: string };
type Source = { sourceType: string | null; sourceId: string | null; category: string | null; sourceVersion?: string | null; userId: string };

/** Bekletilen hatırlatma gönderilmeden önce güncel ilişki ve kaynak tekrar doğrulanır. */
async function currentSource(tx: Prisma.TransactionClient, source: Source, now = new Date()): Promise<string | null> {
  const { sourceId, sourceType, userId, category } = source;
  if (!sourceId || !category) return null;
  if (sourceType === "LESSON") {
    const lesson = await tx.lesson.findFirst({ where: { id: sourceId, status: "PLANNED", group: { isActive: true, enrollments: { some: { endedAt: null, student: { user: { status: "ACTIVE" }, OR: [{ userId }, { parents: { some: { parentId: userId, active: true, endedAt: null, canViewAcademic: true } } }] } } } } }, select: { startsAt: true } });
    const version = lesson && lesson.startsAt > now ? lesson.startsAt.toISOString() : null;
    return version && (!source.sourceVersion || source.sourceVersion === version) ? version : null;
  }
  const active: Prisma.CoachAssignmentWhereInput = { endedAt: null, coach: { user: { status: "ACTIVE" } }, student: { user: { status: "ACTIVE", productMemberships: { some: { product: "OK", revokedAt: null, startsAt: { lte: now }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] } } } } };
  if (sourceType === "COACHING") {
    const session = await tx.coachingSession.findFirst({ where: { id: sourceId, status: "PLANNED", assignment: { AND: [active, { OR: [{ coach: { userId } }, { student: { OR: [{ userId }, { parents: { some: { parentId: userId, active: true, endedAt: null, canViewAcademic: true } } }] } }] }] } }, select: { version: true, scheduledAt: true, rescheduleRequestedAt: true, proposedAt: true } });
    if (!session) return null;
    if (category.startsWith("T24")) {
      const version = session.scheduledAt.toISOString();
      return session.scheduledAt > now && !session.rescheduleRequestedAt && (!source.sourceVersion || source.sourceVersion === version) ? version : null;
    }
    return session.rescheduleRequestedAt && (category.startsWith("REQUEST:") || (category.startsWith("SAVE:") && session.proposedAt)) ? String(session.version) : null;
  }
  if (sourceType === "PLAN" && category.startsWith("APPROVAL:") && getPanelFeatureFlags().adaptivePlan) {
    const weekStart = new Date(`${category.slice("APPROVAL:".length)}T00:00:00+03:00`);
    if (Number.isNaN(weekStart.getTime())) return null;
    const assignment = await tx.coachAssignment.findFirst({ where: { id: sourceId, AND: [active, { coach: { userId }, student: { weeklyPlans: { none: { weekStart, status: "APPROVED" } } } }] }, select: { id: true } });
    return assignment ? category : null;
  }
  return null;
}
function timing(preference: { quietStartMinute: number | null; quietEndMinute: number | null; dailyDigest: boolean; dailyDigestMinute: number | null } | null) {
  return preference ?? { quietStartMinute: null, quietEndMinute: null, dailyDigest: false, dailyDigestMinute: null };
}

export async function produceNotification(tx: Prisma.TransactionClient, intent: NotificationIntent, preferenceKey: NotificationPreferenceKey, now = new Date()) {
  const user = await tx.user.findFirst({ where: { id: intent.userId, status: "ACTIVE" }, select: { email: true, notificationPrefs: true } });
  const preference = user?.notificationPrefs;
  if (!user || (preference && !preference[preferenceKey]) || (preference && !preference.inAppEnabled && !preference.emailEnabled)) return 0;
  const sourceVersion = await currentSource(tx, intent, now);
  if (!sourceVersion) return 0;
  const availableAt = notificationDeliveryAt(now, timing(preference ?? null));
  const pending = availableAt > now;
  const id = notificationKey(intent.userId, intent.sourceType, intent.sourceId, intent.category);
  const created = await tx.notification.createMany({ data: [{ ...intent, id, preferenceKey, sourceVersion, availableAt, deliveryPending: pending, digestMode: preference?.dailyDigest ?? false, inAppVisible: !pending && (preference?.inAppEnabled ?? true) }], skipDuplicates: true });
  if (created.count && !pending && preference?.emailEnabled) await queueCustomerInformationEmail({ id: `reminder-email:${id}`, to: user.email, title: intent.title, body: intent.body }, tx);
  return created.count && !pending && (preference?.inAppEnabled ?? true) ? 1 : 0;
}

/** Canonical notification rows inherit the existing notification deletion/cascade lifecycle. */
export async function flushNotificationDeliveries(now = new Date()) {
  const candidates = await prisma.notification.findMany({ where: { deliveryPending: true, availableAt: { lte: now } }, select: { id: true, userId: true }, orderBy: [{ availableAt: "asc" }, { id: "asc" }], take: 500 });
  let delivered = 0;
  for (const candidate of candidates) delivered += await prisma.$transaction(async (tx) => {
    const row = await tx.notification.findFirst({ where: { id: candidate.id, deliveryPending: true, availableAt: { lte: now } } });
    if (!row) return 0;
    const user = await tx.user.findFirst({ where: { id: row.userId, status: "ACTIVE" }, select: { email: true, notificationPrefs: true } });
    const preference = user?.notificationPrefs;
    const prefKey = row.preferenceKey as NotificationPreferenceKey;
    const quietEnd = afterQuietHours(now, timing(preference ?? null));
    if (quietEnd > now) { await tx.notification.update({ where: { id: row.id }, data: { availableAt: quietEnd } }); return 0; }
    if (!user || (preference && !preference[prefKey]) || !await currentSource(tx, row, now)) {
      await tx.notification.update({ where: { id: row.id }, data: { deliveryPending: false } }); return 0;
    }
    if (!row.digestMode || !preference?.dailyDigest) {
      const changed = await tx.notification.updateMany({ where: { id: row.id, deliveryPending: true }, data: { deliveryPending: false, inAppVisible: preference?.inAppEnabled ?? true } });
      if (changed.count && preference?.emailEnabled) await queueCustomerInformationEmail({ id: `reminder-email:${row.id}`, to: user.email, title: row.title, body: row.body }, tx);
      return changed.count;
    }
    const rows = await tx.notification.findMany({ where: { userId: row.userId, digestMode: true, deliveryPending: true, availableAt: { lte: now } }, orderBy: { createdAt: "asc" } });
    const valid: typeof rows = [];
    for (const item of rows) if ((!preference || preference[item.preferenceKey as NotificationPreferenceKey]) && await currentSource(tx, item, now)) valid.push(item);
    const id = notificationKey(row.userId, "SUMMARY", formatIstanbulDateInput(now), "DAILY");
    const body = valid.slice(0, 12).map((item) => `${item.title}: ${item.body}`).join("\n") + (valid.length > 12 ? `\n${valid.length - 12} gelişme daha var.` : "");
    const result = valid.length ? await tx.notification.createMany({ data: [{ id, userId: row.userId, type: "SYSTEM", title: "Günün gelişmeleri", body, href: "/panel/bildirimler", inAppVisible: preference?.inAppEnabled ?? true }], skipDuplicates: true }) : { count: 0 };
    if (result.count && preference?.emailEnabled) await queueCustomerInformationEmail({ id: `reminder-email:${id}`, to: user.email, title: "Günün gelişmeleri", body }, tx);
    // A late cron retry cannot send a second summary on the same local day.
    if (!result.count && valid.length) {
      const next = notificationDeliveryAt(now, { ...timing(preference ?? null), dailyDigest: true, dailyDigestMinute: preference?.dailyDigestMinute ?? 0 });
      await tx.notification.updateMany({ where: { id: { in: valid.map((item) => item.id) }, deliveryPending: true }, data: { availableAt: next } });
      await tx.notification.updateMany({ where: { id: { in: rows.filter((item) => !valid.some((validItem) => validItem.id === item.id)).map((item) => item.id) } }, data: { deliveryPending: false } });
    } else await tx.notification.updateMany({ where: { id: { in: rows.map((item) => item.id) }, deliveryPending: true }, data: { deliveryPending: false } });
    return result.count;
  });
  return { processed: candidates.length, delivered };
}
