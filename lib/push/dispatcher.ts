import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isNotificationSourceCurrent } from "@/lib/notification-producer";
import { isOdkNotificationSourceCurrent } from "@/lib/odk/student-notifications";
import { classifyNotification, pushCopyFor } from "./classification";
import { evaluatePushEligibility, type SkipReason } from "./eligibility";
import { classifyExpoError, getExpoReceipts, sendExpoMessages, type ExpoMessage } from "./expo-client";
import { pushDeliveryMode, pushLimits, type PushDeliveryMode } from "./config";

/**
 * M5 KALICI PUSH DAĞITICISI — kanonik `Notification` tablosunu tüketir.
 *
 * Aşamalar (her cron koşusunda, sınırlı):
 *  1. FAN-OUT: yeni, görünür, okunmamış, push'a uygun bildirimler için etkin
 *     cihaz başına `PushDelivery(PENDING)` açılır. `(notificationId, deviceId)`
 *     benzersiz → tekrar açılmaz. Cihazın `activatedAt`'inden önceki bildirim
 *     ve `backlogMaxAgeMs`'den eski bildirim alınmaz (geçmiş birikimi yok).
 *  2. CLAIM: `FOR UPDATE SKIP LOCKED` ile kiralama; eşzamanlı işçiler aynı
 *     satırı almaz. Kira süresi dolan (çöken işçi) satır yeniden alınır.
 *  3. EVALUATE + SEND: gönderim anındaki güncel durumla uygunluk (oturum,
 *     tercih, kategori, sessiz saat, kaynak yetkisi). Uygunsa Expo'ya ≤100'lük
 *     partilerle gönderilir; biletler kalıcı yazılır.
 *  4. RECEIPTS: ~15 dk sonra makbuz sorgulanır; `DeviceNotRegistered` cihazı
 *     iptal eder. Makbuz cihaza ulaştığını / görüldüğünü KANITLAMAZ.
 *  5. CLEANUP: saklama süresi dolan teslimler silinir, hareketsiz cihazlar iptal.
 *
 * Tam-bir-kez fiziksel teslim GARANTİ EDİLMEZ: zaman aşımında sonuç belirsizdir
 * ve yeniden deneme yinelenen bildirime yol açabilir (mantıksal tekilleştirme var).
 */

type Metrics = {
  mode: PushDeliveryMode;
  activeDevices: number;
  fannedOut: number;
  claimed: number;
  sent: number;
  accepted: number;
  ticketErrors: number;
  deferred: number;
  skipped: Partial<Record<SkipReason, number>>;
  retried: number;
  failedPermanent: number;
  dryRun: number;
  devicesRevoked: number;
  receiptsChecked: number;
  receiptsOk: number;
  receiptErrors: number;
  pendingBacklog: number;
  oldestPendingAgeMs: number;
  purgedDeliveries: number;
  idleDevicesRevoked: number;
  durationMs: number;
};

function backoffMs(attempts: number, retryAfterMs: number | null): number {
  const base = Math.min(60 * 60_000, 30_000 * 2 ** Math.max(0, attempts - 1));
  const jitter = Math.floor(Math.random() * 10_000);
  return Math.max(retryAfterMs ?? 0, base + jitter);
}

async function fanOut(now: Date, limits: ReturnType<typeof pushLimits>): Promise<number> {
  const cutoff = new Date(now.getTime() - limits.backlogMaxAgeMs);
  const notifications = await prisma.notification.findMany({
    where: {
      createdAt: { gte: cutoff },
      inAppVisible: true,
      readAt: null,
      deliveryPending: false,
      pushDeliveries: { none: {} },
      user: { status: "ACTIVE", role: { in: ["STUDENT", "PARENT"] }, notificationPrefs: { pushEnabled: true }, pushDevices: { some: { revokedAt: null } } },
    },
    orderBy: { createdAt: "asc" },
    take: limits.maxFanOutPerRun,
    select: { id: true, userId: true, createdAt: true, type: true, sourceType: true, category: true, preferenceKey: true, href: true },
  });
  const eligible = notifications.filter((row) => classifyNotification(row));
  if (!eligible.length) return 0;
  const devices = await prisma.pushDevice.findMany({
    where: { userId: { in: [...new Set(eligible.map((row) => row.userId))] }, revokedAt: null },
    select: { id: true, userId: true, activatedAt: true },
  });
  const data = eligible.flatMap((row) =>
    devices.filter((device) => device.userId === row.userId && device.activatedAt <= row.createdAt).map((device) => ({ notificationId: row.id, deviceId: device.id, nextAttemptAt: now })),
  );
  return data.length ? (await prisma.pushDelivery.createMany({ data, skipDuplicates: true })).count : 0;
}

async function claim(now: Date, limit: number, leaseMs: number): Promise<{ ids: string[]; token: string }> {
  const token = randomUUID();
  const leaseUntil = new Date(now.getTime() + leaseMs);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE "push_deliveries" SET "state" = 'CLAIMED', "claim_token" = ${token}, "lease_expires_at" = ${leaseUntil}, "attempts" = "attempts" + 1, "updated_at" = ${now}
    WHERE "id" IN (
      SELECT "id" FROM "push_deliveries"
      WHERE ("state" IN ('PENDING', 'RETRY') AND "next_attempt_at" <= ${now})
         OR ("state" = 'CLAIMED' AND "lease_expires_at" < ${now})
      ORDER BY "next_attempt_at" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING "id"`);
  return { ids: rows.map((row) => row.id), token };
}

/** Kiralanan satırı yalnız aynı kira belirteciyle günceller (başka işçi almışsa yazmaz). */
function finish(id: string, token: string, data: Prisma.PushDeliveryUpdateManyMutationInput) {
  return prisma.pushDelivery.updateMany({ where: { id, claimToken: token, state: "CLAIMED" }, data: { ...data, claimToken: null, leaseExpiresAt: null } });
}

async function sourceValid(row: { userId: string; sourceType: string | null; sourceId: string | null; sourceVersion: string | null; category: string | null }, now: Date): Promise<boolean> {
  if (!row.sourceType || !row.sourceId) return true;
  if (row.sourceType === "ODK_EXAM") return isOdkNotificationSourceCurrent({ userId: row.userId, examId: row.sourceId, category: row.category ?? "" }, now);
  if (row.sourceType === "LESSON" || row.sourceType === "COACHING" || row.sourceType === "PLAN") return isNotificationSourceCurrent(row, now);
  return true;
}

async function processClaimed(ids: string[], token: string, now: Date, mode: PushDeliveryMode, metrics: Metrics, limits: ReturnType<typeof pushLimits>) {
  const deliveries = await prisma.pushDelivery.findMany({
    where: { id: { in: ids }, claimToken: token },
    select: {
      id: true,
      attempts: true,
      device: { select: { id: true, userId: true, expoPushToken: true, revokedAt: true, platform: true, session: { select: { revokedAt: true, expiresAt: true } } } },
      notification: {
        select: {
          id: true, userId: true, createdAt: true, readAt: true, inAppVisible: true, type: true, sourceType: true, sourceId: true, sourceVersion: true, category: true, preferenceKey: true, href: true,
          user: { select: { status: true, notificationPrefs: true } },
        },
      },
    },
  });
  const outgoing: Array<{ id: string; attempts: number; deviceId: string; message: ExpoMessage }> = [];
  for (const delivery of deliveries) {
    const { notification, device } = delivery;
    const pushClass = classifyNotification(notification);
    const prefs = notification.user.notificationPrefs;
    const decision = evaluatePushEligibility({
      now,
      notification,
      pushClass,
      device,
      session: device.session,
      user: notification.user,
      preference: prefs,
      sourceValid: await sourceValid(notification, now),
    });
    if (decision.kind === "SKIP") {
      metrics.skipped[decision.reason] = (metrics.skipped[decision.reason] ?? 0) + 1;
      await finish(delivery.id, token, { state: "CANCELED", lastErrorCode: decision.reason });
      continue;
    }
    if (decision.kind === "DEFER") {
      metrics.deferred += 1;
      // Sessiz saat: deneme sayılmaz.
      await finish(delivery.id, token, { state: "PENDING", nextAttemptAt: decision.until, attempts: { decrement: 1 }, lastErrorCode: "QUIET_HOURS" });
      continue;
    }
    if (mode === "DRY_RUN") {
      metrics.dryRun += 1;
      await finish(delivery.id, token, { state: "CANCELED", lastErrorCode: "DRY_RUN" });
      continue;
    }
    const copy = pushCopyFor(pushClass!, notification);
    outgoing.push({
      id: delivery.id,
      attempts: delivery.attempts,
      deviceId: device.id,
      // YÜK: yalnız opak bildirim kimliği. Ad, not, net, URL yok.
      message: { to: device.expoPushToken, title: copy.title, body: copy.body, data: { notificationId: notification.id }, sound: "default", priority: "high", channelId: "default", ttl: Math.max(60, Math.floor(pushClass!.ttlMs / 1000)) },
    });
  }

  for (let index = 0; index < outgoing.length; index += limits.batchSize) {
    const batch = outgoing.slice(index, index + limits.batchSize);
    metrics.sent += batch.length;
    const result = await sendExpoMessages(batch.map((item) => item.message), limits.httpTimeoutMs);
    if (!result.ok) {
      for (const item of batch) {
        if (result.transient && item.attempts < limits.maxAttempts) {
          metrics.retried += 1;
          await finish(item.id, token, { state: "RETRY", nextAttemptAt: new Date(now.getTime() + backoffMs(item.attempts, result.retryAfterMs)), lastErrorCode: result.code });
        } else {
          metrics.failedPermanent += 1;
          await finish(item.id, token, { state: "FAILED", lastErrorCode: result.code });
        }
      }
      continue;
    }
    for (let position = 0; position < batch.length; position += 1) {
      const item = batch[position];
      const ticket = result.data[position];
      if (ticket?.status === "ok") {
        metrics.accepted += 1;
        await finish(item.id, token, { state: "ACCEPTED", ticketId: ticket.id, submittedAt: now, lastErrorCode: null });
        continue;
      }
      metrics.ticketErrors += 1;
      const error = classifyExpoError(ticket?.details?.error);
      if (error.revokeDevice) {
        metrics.devicesRevoked += 1;
        await prisma.pushDevice.updateMany({ where: { id: item.deviceId, revokedAt: null }, data: { revokedAt: now, revokedReason: error.code } });
      }
      if (!error.permanent && item.attempts < limits.maxAttempts) {
        metrics.retried += 1;
        await finish(item.id, token, { state: "RETRY", nextAttemptAt: new Date(now.getTime() + backoffMs(item.attempts, null)), lastErrorCode: error.code });
      } else {
        metrics.failedPermanent += 1;
        await finish(item.id, token, { state: "FAILED", lastErrorCode: error.code });
      }
    }
  }
}

async function processReceipts(now: Date, metrics: Metrics, limits: ReturnType<typeof pushLimits>) {
  // Makbuz bulunamayacak kadar eski bilet: sorgulama bırakılır (durum ACCEPTED kalır).
  await prisma.pushDelivery.updateMany({
    where: { state: "ACCEPTED", receiptStatus: null, submittedAt: { lt: new Date(now.getTime() - limits.receiptGiveUpMs) } },
    data: { receiptStatus: "UNAVAILABLE", receiptCheckedAt: now },
  });
  const due = await prisma.pushDelivery.findMany({
    where: { state: "ACCEPTED", receiptStatus: null, ticketId: { not: null }, submittedAt: { lte: new Date(now.getTime() - limits.receiptDelayMs) } },
    orderBy: { submittedAt: "asc" },
    take: limits.receiptBatch,
    select: { id: true, ticketId: true, deviceId: true, attempts: true },
  });
  if (!due.length) return;
  const result = await getExpoReceipts(due.map((row) => row.ticketId!), limits.httpTimeoutMs);
  if (!result.ok) return; // Geçici: bir sonraki koşuda yeniden sorgulanır (idempotent).
  for (const row of due) {
    const receipt = result.data[row.ticketId!];
    if (!receipt) continue; // Henüz hazır değil.
    metrics.receiptsChecked += 1;
    if (receipt.status === "ok") {
      metrics.receiptsOk += 1;
      await prisma.pushDelivery.updateMany({ where: { id: row.id, state: "ACCEPTED" }, data: { state: "PROVIDER_ACCEPTED", receiptStatus: "ok", receiptCheckedAt: now } });
      continue;
    }
    metrics.receiptErrors += 1;
    const error = classifyExpoError(receipt.details?.error);
    if (error.revokeDevice) {
      metrics.devicesRevoked += 1;
      await prisma.pushDevice.updateMany({ where: { id: row.deviceId, revokedAt: null }, data: { revokedAt: now, revokedReason: error.code } });
    }
    const retry = !error.permanent && row.attempts < limits.maxAttempts;
    await prisma.pushDelivery.updateMany({
      where: { id: row.id, state: "ACCEPTED" },
      data: retry
        ? { state: "RETRY", ticketId: null, submittedAt: null, nextAttemptAt: new Date(now.getTime() + backoffMs(row.attempts, null)), receiptStatus: null, lastErrorCode: error.code }
        : { state: "FAILED", receiptStatus: "error", receiptCheckedAt: now, lastErrorCode: error.code },
    });
  }
}

async function cleanup(now: Date, metrics: Metrics, limits: ReturnType<typeof pushLimits>) {
  const purged = await prisma.pushDelivery.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - limits.deliveryRetentionDays * 86_400_000) }, state: { notIn: ["CLAIMED"] } } });
  metrics.purgedDeliveries = purged.count;
  const idle = await prisma.pushDevice.updateMany({ where: { revokedAt: null, lastSeenAt: { lt: new Date(now.getTime() - limits.deviceIdleRevokeDays * 86_400_000) } }, data: { revokedAt: now, revokedReason: "IDLE" } });
  metrics.idleDevicesRevoked = idle.count;
  // Oturumu sona ermiş / iptal edilmiş cihazlar da iptal edilir (sunucu tarafı bağ).
  const sessionGone = await prisma.pushDevice.updateMany({ where: { revokedAt: null, session: { OR: [{ revokedAt: { not: null } }, { expiresAt: { lte: now } }] } }, data: { revokedAt: now, revokedReason: "SESSION_ENDED" } });
  metrics.idleDevicesRevoked += sessionGone.count;
}

export async function runPushDispatch(now = new Date()): Promise<Metrics> {
  const started = Date.now();
  const mode = pushDeliveryMode();
  const limits = pushLimits();
  const metrics: Metrics = {
    mode, activeDevices: 0, fannedOut: 0, claimed: 0, sent: 0, accepted: 0, ticketErrors: 0, deferred: 0, skipped: {}, retried: 0,
    failedPermanent: 0, dryRun: 0, devicesRevoked: 0, receiptsChecked: 0, receiptsOk: 0, receiptErrors: 0, pendingBacklog: 0, oldestPendingAgeMs: 0,
    purgedDeliveries: 0, idleDevicesRevoked: 0, durationMs: 0,
  };
  if (mode !== "DISABLED") {
    metrics.fannedOut = await fanOut(now, limits);
    const { ids, token } = await claim(now, limits.maxPerRun, limits.leaseMs);
    metrics.claimed = ids.length;
    if (ids.length) await processClaimed(ids, token, now, mode, metrics, limits);
    if (mode === "ENABLED") await processReceipts(now, metrics, limits);
  }
  await cleanup(now, metrics, limits);
  const [activeDevices, backlog, oldest] = await Promise.all([
    prisma.pushDevice.count({ where: { revokedAt: null } }),
    prisma.pushDelivery.count({ where: { state: { in: ["PENDING", "RETRY", "CLAIMED"] } } }),
    prisma.pushDelivery.findFirst({ where: { state: { in: ["PENDING", "RETRY"] } }, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  metrics.activeDevices = activeDevices;
  metrics.pendingBacklog = backlog;
  metrics.oldestPendingAgeMs = oldest ? now.getTime() - oldest.createdAt.getTime() : 0;
  metrics.durationMs = Date.now() - started;
  return metrics;
}
