import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  buildDeduplicationKey,
  CURRENT_EVENT_VERSION,
  MAX_OUTBOX_ATTEMPTS,
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

  // Tekrar yayınlar (retry, çift tıklama, yeniden işlenen mutation) burada
  // sessizce düşer. ÖNCE okuyoruz: `create` bir transaction içinde benzersizlik
  // ihlaline düşerse PostgreSQL transaction'ı komple abort eder ve hatayı
  // yutmak çağıranın geri kalan yazımlarını da bozar.
  const existing = await tx.crossProductEventOutbox.findUnique({
    where: { deduplicationKey },
    select: { id: true },
  });
  if (existing) return { emitted: false, eventId: null };

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
    // Mesaj metnine bakmak kırılgandı; Prisma'nın hata kodu tek doğru sinyal.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
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
  /** Deneme hakkı bitmiş, elle müdahale bekleyen olaylar (ölü mektup). */
  deadLetterCount: number;
  /** Şu an bir işleyicide kilitli görünen olaylar. */
  processingCount: number;
  oldestPendingAt: Date | null;
};

/**
 * Ölü mektup ve kilitli sayaçları PENDING/FAILED'den AYRI tutulur: deneme hakkı
 * tükenmiş bir olay artık kendiliğinden işlenmez, tek başına alarm konusudur.
 */
export async function getOutboxHealthMetrics(): Promise<OutboxHealthMetrics> {
  const [pendingCount, failedCount, deadLetterCount, processingCount, oldest] = await Promise.all([
    prisma.crossProductEventOutbox.count({ where: { status: "PENDING" } }),
    prisma.crossProductEventOutbox.count({
      where: { status: "FAILED", attempts: { lt: MAX_OUTBOX_ATTEMPTS } },
    }),
    prisma.crossProductEventOutbox.count({
      where: { status: { in: ["PENDING", "FAILED"] }, attempts: { gte: MAX_OUTBOX_ATTEMPTS } },
    }),
    prisma.crossProductEventOutbox.count({ where: { status: "PROCESSING" } }),
    prisma.crossProductEventOutbox.findFirst({
      where: { status: "PENDING" },
      orderBy: { occurredAt: "asc" },
      select: { occurredAt: true },
    }),
  ]);
  return {
    pendingCount,
    failedCount,
    deadLetterCount,
    processingCount,
    oldestPendingAt: oldest?.occurredAt ?? null,
  };
}
