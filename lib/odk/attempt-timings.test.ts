import assert from "node:assert/strict";
import test from "node:test";

import { foldAttemptTimings } from "./attempt-timings";

const allowed = new Set(["q1", "q2"]);
const now = new Date("2026-09-13T10:00:00.000Z");

test("foldAttemptTimings drops questions outside the allow list from the accepted count", () => {
  const result = foldAttemptTimings([
    { questionId: "q1", activeDurationMs: 1_000 },
    { questionId: "foreign", activeDurationMs: 5_000 },
  ], allowed, now);
  assert.equal(result.accepted, 1);
  assert.deepEqual(result.rows.map((row) => row.questionId), ["q1"]);
});

test("foldAttemptTimings replays repeated questions like sequential create then update", () => {
  const result = foldAttemptTimings([
    { questionId: "q1", activeDurationMs: 1_000, enteredAt: "2026-09-13T09:00:00.000Z", leftAt: "2026-09-13T09:01:00.000Z" },
    { questionId: "q1", activeDurationMs: 2_000, enteredAt: "2026-09-13T09:05:00.000Z" },
    { questionId: "q1", activeDurationMs: 40 * 60_000 },
  ], allowed, now);
  assert.equal(result.accepted, 3);
  const [row] = result.rows;
  assert.equal(row.visits, 3);
  // İlk girdi olduğu gibi, sonrakiler 30 dakikayla sınırlı eklenir.
  assert.equal(row.insertDurationMs, 1_000 + 2_000 + 30 * 60_000);
  assert.equal(row.deltaDurationMs, 1_000 + 2_000 + 30 * 60_000);
  // firstEnteredAt ilk girdiden gelir; sonraki enteredAt'ler yok sayılır.
  assert.equal(row.firstEnteredAt.toISOString(), "2026-09-13T09:00:00.000Z");
  // leftAt'i olmayan sonraki girdiler önceki değeri korur.
  assert.equal(row.lastLeftAt?.toISOString(), "2026-09-13T09:01:00.000Z");
});

test("foldAttemptTimings keeps insert and update durations distinct for out-of-range first entries", () => {
  const result = foldAttemptTimings([{ questionId: "q2", activeDurationMs: 45 * 60_000 }], allowed, now);
  const [row] = result.rows;
  assert.equal(row.insertDurationMs, 45 * 60_000);
  assert.equal(row.deltaDurationMs, 30 * 60_000);
  assert.equal(row.firstEnteredAt, now);
  assert.equal(row.lastLeftAt, null);
});
