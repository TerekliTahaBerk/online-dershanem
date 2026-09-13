import "server-only";

import type { CrossProductEventOutbox, ProductCode } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_OUTBOX_ATTEMPTS } from "@/lib/student-success/events";
import type { CrossProductEventPayload, CrossProductEventType, EventConsumerKey } from "@/lib/student-success/events";
import { consumeAssignmentProjection } from "@/lib/student-success/server/consumers/assignment-projection";
import { consumeLessonCloseSuggestions } from "@/lib/student-success/server/consumers/lesson-close-suggestions";
import { consumeLessonMissedRecovery } from "@/lib/student-success/server/consumers/lesson-missed-recovery";
import { consumeMockExamCoachBridge } from "@/lib/student-success/server/consumers/mock-exam-coach-bridge";
import { consumeEvidenceRecorder } from "@/lib/student-success/server/consumers/evidence-recorder";
import { consumeMasteryRescore } from "@/lib/student-success/server/consumers/mastery-rescore";
import { consumeTimelineWriter } from "@/lib/student-success/server/consumers/timeline-writer";
import { consumeNotificationOrchestrator } from "@/lib/student-success/server/consumers/notification-orchestrator";

type ConsumerHandler = (event: CrossProductEventOutbox) => Promise<void>;

const NOTIFICATION_ORCHESTRATOR = { "notification-orchestrator": consumeNotificationOrchestrator };

const CONSUMER_MAP: Partial<Record<CrossProductEventType, Partial<Record<EventConsumerKey, ConsumerHandler>>>> = {
  ASSIGNMENT_CREATED: {
    "assignment-projection": consumeAssignmentProjection,
    "timeline-writer": consumeTimelineWriter,
    ...NOTIFICATION_ORCHESTRATOR,
  },
  ASSIGNMENT_COMPLETED: {
    "evidence-recorder": consumeEvidenceRecorder,
    "mastery-rescore": consumeMasteryRescore,
    "timeline-writer": consumeTimelineWriter,
  },
  LESSON_COMPLETED: {
    "lesson-close-suggestions": consumeLessonCloseSuggestions,
    "evidence-recorder": consumeEvidenceRecorder,
    "mastery-rescore": consumeMasteryRescore,
    "timeline-writer": consumeTimelineWriter,
  },
  LESSON_MISSED: {
    "lesson-missed-recovery": consumeLessonMissedRecovery,
    "timeline-writer": consumeTimelineWriter,
  },
  MOCK_EXAM_RESULT_PUBLISHED: {
    "mock-exam-coach-bridge": consumeMockExamCoachBridge,
    "evidence-recorder": consumeEvidenceRecorder,
    "mastery-rescore": consumeMasteryRescore,
    "timeline-writer": consumeTimelineWriter,
  },
  /*
   * COACHING_TASK_COMPLETED — KANIT ÜRETMEZ, bilerek.
   *
   * `evidence-recorder` bu olay için buraya kayıtlıydı ama `consumeEvidenceRecorder`
   * onu hiç ele almıyor: üç `if` bloğunun hiçbirine düşmeden `undefined`
   * dönüyor ve olay "işlendi" işaretleniyordu. Haritaya bakan biri kanıt
   * yazıldığını sanıyordu; hiçbir zaman yazılmadı.
   *
   * Kayıt kaldırıldı, çünkü `WeeklyPlanTask` bir KAZANIMA BAĞLI DEĞİL:
   * modelde `outcomeId` yok. Kanıt yazmak, "20 soru çözdü" gibi bir girdiden
   * uydurma bir kazanım ilişkisi kurmak olurdu — mastery modelini bozar.
   * Koçum görevi tamamlanması öğrenciye plan ekranı ve zaman çizelgesi
   * üzerinden görünür; tamamlanma anındaki zaman çizelgesi kaydını
   * `/api/panel/kocum/tasks/[id]/complete` ucu SENKRON yazar.
   */
  COACHING_TASK_COMPLETED: {
    "timeline-writer": consumeTimelineWriter,
  },
  COACHING_PLAN_PUBLISHED: {
    "timeline-writer": consumeTimelineWriter,
    ...NOTIFICATION_ORCHESTRATOR,
  },
  MOCK_EXAM_ASSIGNED: {
    "timeline-writer": consumeTimelineWriter,
    ...NOTIFICATION_ORCHESTRATOR,
  },
};

/**
 * Bir olay PROCESSING'e alındıktan sonra işleyici ölürse (fonksiyon zaman
 * aşımı, deploy, OOM) olay o statüde asılı kalır. Aday sorgusu yalnız
 * PENDING/FAILED seçtiği için böyle bir olay BİR DAHA HİÇ işlenmezdi:
 * ödev projeksiyonu veya ders kanıtı sessizce kaybolurdu. Bu eşikten eski
 * kilitler yeniden denenebilir hâle getirilir.
 */
const STALE_LOCK_MS = 15 * 60 * 1000;

async function hasConsumerProcessed(eventId: string, consumerKey: EventConsumerKey): Promise<boolean> {
  const row = await prisma.crossProductEventConsumer.findUnique({
    where: { eventId_consumerKey: { eventId, consumerKey } },
    select: { id: true },
  });
  return Boolean(row);
}

/**
 * Consumer işaretini yazar. Aynı olayı paralel bir işleyici de aldıysa
 * benzersizlik ihlali gelir; bu bir HATA DEĞİL — iş zaten yapılmış demektir.
 * Eskiden bu ihlal genel `catch`e düşüp olayı FAILED işaretliyor ve deneme
 * sayacını tüketiyordu.
 */
async function markConsumerProcessed(eventId: string, consumerKey: EventConsumerKey): Promise<void> {
  try {
    await prisma.crossProductEventConsumer.create({
      data: { eventId, consumerKey },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}

export type ProcessOutboxResult = {
  processed: number;
  failed: number;
  skipped: number;
  duplicateRejections: number;
  /** Bayat PROCESSING kilidinden kurtarılan olay sayısı. */
  staleLocksRecovered: number;
  /** Paralel bir işleyici tarafından kapılmış olay sayısı. */
  claimConflicts: number;
};

/** Bayat PROCESSING kilitlerini yeniden denenebilir hâle getirir. */
export async function recoverStaleOutboxLocks(now = new Date()): Promise<number> {
  const result = await prisma.crossProductEventOutbox.updateMany({
    where: { status: "PROCESSING", lockedAt: { lt: new Date(now.getTime() - STALE_LOCK_MS) } },
    data: { status: "FAILED", lockedAt: null, lastError: "STALE_LOCK_RECOVERED" },
  });
  return result.count;
}

export async function processCrossProductEventOutbox(limit = 50): Promise<ProcessOutboxResult> {
  const staleLocksRecovered = await recoverStaleOutboxLocks();

  const events = await prisma.crossProductEventOutbox.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: MAX_OUTBOX_ATTEMPTS } },
    orderBy: { occurredAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;
  let duplicateRejections = 0;
  let claimConflicts = 0;

  for (const event of events) {
    const consumers = CONSUMER_MAP[event.eventType];
    if (!consumers) {
      await prisma.crossProductEventOutbox.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date(), lockedAt: null },
      });
      skipped += 1;
      continue;
    }

    // Atomik kapma: aynı anda çalışan ikinci bir işleyici (üst üste binen cron,
    // elle tetikleme) aynı olayı seçmiş olabilir. Statü koşullu `updateMany`
    // yalnız TEK bir işleyicinin devam etmesini sağlar.
    const claim = await prisma.crossProductEventOutbox.updateMany({
      where: { id: event.id, status: event.status },
      data: { status: "PROCESSING", lockedAt: new Date(), attempts: { increment: 1 } },
    });
    if (claim.count === 0) {
      claimConflicts += 1;
      continue;
    }

    let eventFailed = false;
    for (const [consumerKey, handler] of Object.entries(consumers) as Array<[EventConsumerKey, ConsumerHandler]>) {
      if (await hasConsumerProcessed(event.id, consumerKey)) {
        duplicateRejections += 1;
        continue;
      }
      try {
        await handler(event);
        await markConsumerProcessed(event.id, consumerKey);
      } catch (error) {
        eventFailed = true;
        await prisma.crossProductEventOutbox.update({
          where: { id: event.id },
          data: {
            status: "FAILED",
            lockedAt: null,
            lastError: String(error).slice(0, 500),
          },
        });
        failed += 1;
        break;
      }
    }

    if (!eventFailed) {
      await prisma.crossProductEventOutbox.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date(), lockedAt: null, lastError: null },
      });
      processed += 1;
    }
  }

  return { processed, failed, skipped, duplicateRejections, staleLocksRecovered, claimConflicts };
}

export async function getStudentProducts(userId: string, now = new Date()): Promise<ProductCode[]> {
  const memberships = await prisma.productMembership.findMany({
    where: {
      userId,
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { product: true },
  });
  const products = memberships.map((m) => m.product);
  const odk = await prisma.odkEntitlement.findFirst({
    where: {
      userId,
      startsAt: { lte: now },
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { id: true },
  });
  if (odk && !products.includes("ODK")) products.push("ODK");
  return products;
}

export function parseEventPayload<T extends CrossProductEventType>(
  eventType: T,
  payload: unknown,
): CrossProductEventPayload<T> {
  return payload as CrossProductEventPayload<T>;
}
