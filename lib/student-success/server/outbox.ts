import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildDeduplicationKey,
  CURRENT_EVENT_VERSION,
  type CrossProductEventType,
  type EmitCrossProductEventInput,
  validateEventPayload,
} from "@/lib/student-success/events";

export async function emitCrossProductEvent<T extends CrossProductEventType>(
  input: EmitCrossProductEventInput<T>,
  tx: Prisma.TransactionClient = prisma,
): Promise<{ emitted: boolean; eventId: string | null }> {
  const payload = { ...input.payload, eventVersion: CURRENT_EVENT_VERSION };
  validateEventPayload(input.eventType, payload);

  const deduplicationKey =
    input.deduplicationKey ??
    buildDeduplicationKey({
      eventType: input.eventType,
      studentId: input.studentId,
      entityType: input.entityType,
      entityId: input.entityId,
    });

  try {
    const event = await tx.crossProductEventOutbox.create({
      data: {
        eventType: input.eventType,
        eventVersion: CURRENT_EVENT_VERSION,
        deduplicationKey,
        actorUserId: input.actorUserId ?? null,
        studentId: input.studentId,
        entityType: input.entityType,
        entityId: input.entityId,
        payload,
        occurredAt: input.occurredAt ?? new Date(),
      },
      select: { id: true },
    });
    return { emitted: true, eventId: event.id };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return { emitted: false, eventId: null };
    }
    throw error;
  }
}

export async function emitCrossProductEventsForStudents<T extends CrossProductEventType>(
  studentIds: string[],
  build: (studentId: string) => Omit<EmitCrossProductEventInput<T>, "studentId">,
  tx: Prisma.TransactionClient = prisma,
): Promise<number> {
  let count = 0;
  for (const studentId of studentIds) {
    const result = await emitCrossProductEvent({ ...build(studentId), studentId }, tx);
    if (result.emitted) count += 1;
  }
  return count;
}

export type OutboxHealthMetrics = {
  pendingCount: number;
  failedCount: number;
  oldestPendingAt: Date | null;
};

export async function getOutboxHealthMetrics(): Promise<OutboxHealthMetrics> {
  const [pendingCount, failedCount, oldest] = await Promise.all([
    prisma.crossProductEventOutbox.count({ where: { status: "PENDING" } }),
    prisma.crossProductEventOutbox.count({ where: { status: "FAILED" } }),
    prisma.crossProductEventOutbox.findFirst({
      where: { status: "PENDING" },
      orderBy: { occurredAt: "asc" },
      select: { occurredAt: true },
    }),
  ]);
  return {
    pendingCount,
    failedCount,
    oldestPendingAt: oldest?.occurredAt ?? null,
  };
}
