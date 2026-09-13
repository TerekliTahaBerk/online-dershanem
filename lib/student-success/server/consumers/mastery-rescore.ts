import "server-only";

import type { CrossProductEventOutbox } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeOutcomeMastery, evidenceToSignal } from "@/lib/student-success/mastery";

export async function consumeMasteryRescore(event: CrossProductEventOutbox): Promise<void> {
  const evidenceRows = await prisma.studentProgressEvidence.findMany({
    where: { studentId: event.studentId },
    select: {
      outcomeId: true,
      sourceType: true,
      sourceId: true,
      productCode: true,
      summary: true,
      metrics: true,
      occurredAt: true,
    },
  });

  const byOutcome = new Map<string, typeof evidenceRows>();
  for (const row of evidenceRows) {
    const list = byOutcome.get(row.outcomeId) ?? [];
    list.push(row);
    byOutcome.set(row.outcomeId, list);
  }

  const now = new Date();
  for (const [outcomeId, rows] of byOutcome) {
    const signals = rows.map((row) =>
      evidenceToSignal({
        studentId: event.studentId,
        outcomeId: row.outcomeId,
        sourceType: row.sourceType,
        sourceId: row.sourceId,
        productCode: row.productCode,
        summary: row.summary,
        metrics: row.metrics as Record<string, unknown>,
        occurredAt: row.occurredAt,
      }),
    );
    const result = computeOutcomeMastery(signals, now);

    const previous = await prisma.studentOutcomeMastery.findUnique({
      where: { studentId_outcomeId: { studentId: event.studentId, outcomeId } },
      select: { status: true },
    });

    await prisma.studentOutcomeMastery.upsert({
      where: { studentId_outcomeId: { studentId: event.studentId, outcomeId } },
      create: {
        studentId: event.studentId,
        outcomeId,
        status: result.status,
        explanation: result.explanation,
        evidenceCount: result.evidenceCount,
        computedAt: now,
      },
      update: {
        status: result.status,
        explanation: result.explanation,
        evidenceCount: result.evidenceCount,
        computedAt: now,
      },
    });

    if (previous && previous.status !== result.status) {
      await prisma.crossProductEventOutbox.create({
        data: {
          eventType: "OUTCOME_MASTERY_CHANGED",
          deduplicationKey: `OUTCOME_MASTERY_CHANGED:${event.studentId}:outcome:${outcomeId}:${result.status}:${now.toISOString().slice(0, 10)}`,
          studentId: event.studentId,
          entityType: "LearningOutcome",
          entityId: outcomeId,
          payload: {
            eventVersion: 1,
            outcomeId,
            previousStatus: previous.status,
            newStatus: result.status,
          },
          occurredAt: now,
          status: "PROCESSED",
          processedAt: now,
        },
      }).catch(() => undefined);
    }
  }
}
