import "server-only";

import type { CrossProductEventOutbox, ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { CrossProductEventPayload, CrossProductEventType, EventConsumerKey } from "@/lib/student-success/events";
import { consumeAssignmentProjection } from "@/lib/student-success/server/consumers/assignment-projection";
import { consumeLessonCloseSuggestions } from "@/lib/student-success/server/consumers/lesson-close-suggestions";
import { consumeLessonMissedRecovery } from "@/lib/student-success/server/consumers/lesson-missed-recovery";
import { consumeMockExamCoachBridge } from "@/lib/student-success/server/consumers/mock-exam-coach-bridge";
import { consumeEvidenceRecorder } from "@/lib/student-success/server/consumers/evidence-recorder";
import { consumeMasteryRescore } from "@/lib/student-success/server/consumers/mastery-rescore";
import { consumeTimelineWriter } from "@/lib/student-success/server/consumers/timeline-writer";

type ConsumerHandler = (event: CrossProductEventOutbox) => Promise<void>;

const CONSUMER_MAP: Partial<Record<CrossProductEventType, Partial<Record<EventConsumerKey, ConsumerHandler>>>> = {
  ASSIGNMENT_CREATED: {
    "assignment-projection": consumeAssignmentProjection,
    "timeline-writer": consumeTimelineWriter,
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
  COACHING_TASK_COMPLETED: {
    "evidence-recorder": consumeEvidenceRecorder,
    "timeline-writer": consumeTimelineWriter,
  },
  COACHING_PLAN_PUBLISHED: {
    "timeline-writer": consumeTimelineWriter,
  },
};

async function hasConsumerProcessed(eventId: string, consumerKey: EventConsumerKey): Promise<boolean> {
  const row = await prisma.crossProductEventConsumer.findUnique({
    where: { eventId_consumerKey: { eventId, consumerKey } },
    select: { id: true },
  });
  return Boolean(row);
}

async function markConsumerProcessed(eventId: string, consumerKey: EventConsumerKey): Promise<void> {
  await prisma.crossProductEventConsumer.create({
    data: { eventId, consumerKey },
  });
}

export type ProcessOutboxResult = {
  processed: number;
  failed: number;
  skipped: number;
  duplicateRejections: number;
};

export async function processCrossProductEventOutbox(limit = 50): Promise<ProcessOutboxResult> {
  const events = await prisma.crossProductEventOutbox.findMany({
    where: { status: { in: ["PENDING", "FAILED"] }, attempts: { lt: 5 } },
    orderBy: { occurredAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;
  let duplicateRejections = 0;

  for (const event of events) {
    const consumers = CONSUMER_MAP[event.eventType];
    if (!consumers) {
      await prisma.crossProductEventOutbox.update({
        where: { id: event.id },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      skipped += 1;
      continue;
    }

    await prisma.crossProductEventOutbox.update({
      where: { id: event.id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });

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
        data: { status: "PROCESSED", processedAt: new Date(), lastError: null },
      });
      processed += 1;
    }
  }

  return { processed, failed, skipped, duplicateRejections };
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
