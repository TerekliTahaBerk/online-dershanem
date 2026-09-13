import { randomUUID } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

import { mergeVisitDuration } from "@/lib/odk/time-analysis";

export type AttemptTimingEntry = {
  questionId: string;
  activeDurationMs: number;
  enteredAt?: string;
  leftAt?: string;
};

/** Aynı soruya ait girdilerin, eski satır-satır döngünün sırasıyla katlanmış hali. */
export type FoldedQuestionTiming = {
  questionId: string;
  visits: number;
  /** Satır YOKSA yazılacak süre: ilk girdi `max(0, d)`, sonrakiler `mergeVisitDuration`. */
  insertDurationMs: number;
  /** Satır VARSA mevcut süreye eklenecek miktar: her girdi `mergeVisitDuration`. */
  deltaDurationMs: number;
  firstEnteredAt: Date;
  /** Son null olmayan `leftAt`; hepsi boşsa null (mevcut değer korunur). */
  lastLeftAt: Date | null;
};

/**
 * İzin listesindeki girdileri soru başına tek kayda indirger. Tek bir
 * `INSERT … ON CONFLICT` aynı satırı iki kez güncelleyemediği için, eski
 * döngünün aynı partide tekrar eden soruya yaptığı ardışık create→update
 * etkisi burada bellekte birebir yeniden üretilir.
 */
export function foldAttemptTimings(
  timings: AttemptTimingEntry[],
  allowedQuestionIds: ReadonlySet<string>,
  now: Date = new Date(),
): { accepted: number; rows: FoldedQuestionTiming[] } {
  const byQuestion = new Map<string, FoldedQuestionTiming>();
  let accepted = 0;
  for (const timing of timings) {
    if (!allowedQuestionIds.has(timing.questionId)) continue;
    accepted += 1;
    const leftAt = timing.leftAt ? new Date(timing.leftAt) : null;
    const current = byQuestion.get(timing.questionId);
    if (!current) {
      byQuestion.set(timing.questionId, {
        questionId: timing.questionId,
        visits: 1,
        insertDurationMs: Math.max(0, timing.activeDurationMs),
        deltaDurationMs: mergeVisitDuration(0, timing.activeDurationMs),
        firstEnteredAt: timing.enteredAt ? new Date(timing.enteredAt) : now,
        lastLeftAt: leftAt,
      });
      continue;
    }
    current.visits += 1;
    current.insertDurationMs = mergeVisitDuration(current.insertDurationMs, timing.activeDurationMs);
    current.deltaDurationMs = mergeVisitDuration(current.deltaDurationMs, timing.activeDurationMs);
    current.lastLeftAt = leftAt || current.lastLeftAt;
  }
  return { accepted, rows: [...byQuestion.values()] };
}

/**
 * Timing partisini tek SQL ifadesiyle yazar (girdi sayısından bağımsız 1 sorgu).
 * Tek ifade atomiktir: FK ihlali gibi bir hata partinin hiçbir satırını
 * yazmaz. `(attempt_id, question_id)` unique index'i çakışmayı çözer; eşzamanlı
 * iki istek artık P2002 ile düşmez ve birbirinin artışını ezmez.
 */
export async function recordAttemptQuestionTimings(
  client: Pick<PrismaClient, "$executeRaw">,
  attemptId: string,
  timings: AttemptTimingEntry[],
  allowedQuestionIds: ReadonlySet<string>,
): Promise<number> {
  const now = new Date();
  const { accepted, rows } = foldAttemptTimings(timings, allowedQuestionIds, now);
  if (rows.length === 0) return accepted;

  const values = Prisma.join(
    rows.map((row) => Prisma.sql`(
      ${randomUUID()}::text,
      ${row.questionId}::text,
      ${row.visits}::int,
      ${row.insertDurationMs}::int,
      ${row.deltaDurationMs}::int,
      ${row.firstEnteredAt}::timestamptz,
      ${row.lastLeftAt}::timestamptz
    )`),
  );

  await client.$executeRaw`
    WITH incoming (id, question_id, visits, insert_ms, delta_ms, first_entered_at, last_left_at) AS (
      VALUES ${values}
    )
    INSERT INTO "odk_attempt_question_timings" AS t
      ("id", "attempt_id", "question_id", "visit_count", "active_duration_ms", "first_entered_at", "last_left_at", "updated_at")
    SELECT incoming.id, ${attemptId}, incoming.question_id, incoming.visits, incoming.insert_ms,
           incoming.first_entered_at, incoming.last_left_at, ${now}::timestamptz
    FROM incoming
    ON CONFLICT ("attempt_id", "question_id") DO UPDATE SET
      "active_duration_ms" = t."active_duration_ms"
        + (SELECT incoming.delta_ms FROM incoming WHERE incoming.question_id = EXCLUDED."question_id"),
      "visit_count" = t."visit_count" + EXCLUDED."visit_count",
      "last_left_at" = COALESCE(EXCLUDED."last_left_at", t."last_left_at"),
      "updated_at" = EXCLUDED."updated_at"
  `;
  return accepted;
}
