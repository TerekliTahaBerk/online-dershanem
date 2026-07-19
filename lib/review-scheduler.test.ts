import assert from "node:assert/strict";
import test from "node:test";
import { initialReviewDueAt, reviewIntervalsDays, sameLocalDay, scheduleReview } from "./review-scheduler";

const now = new Date("2026-07-20T09:00:00Z");

test("doğru yanıt 3–7–14–30 gün basamaklarında ilerler", () => {
  let stage = 0;
  for (const expected of [3, 7, 14, 30]) {
    const result = scheduleReview(stage, "CORRECT", now);
    assert.equal(result.intervalDays, expected); stage = result.stage;
  }
  assert.deepEqual(reviewIntervalsDays, [1, 3, 7, 14, 30]);
});

test("30 günlük doğru geri çağırma öğeyi tamamlar", () => {
  const result = scheduleReview(4, "CORRECT", now);
  assert.equal(result.mastered, true); assert.equal(result.dueAt, null);
});

test("yanlış ve emin değilim geçmişi silmeden daha yakın tarihe taşır", () => {
  assert.equal(scheduleReview(3, "WRONG", now).intervalDays, 1);
  assert.equal(scheduleReview(3, "UNSURE", now).intervalDays, 7);
});

test("geçmiş kaynaktan gelen ilk tekrar bugün erişilebilir olur", () => {
  assert.equal(initialReviewDueAt(new Date("2026-07-01T09:00:00Z"), now).getTime(), now.getTime());
  assert.equal(sameLocalDay(now, new Date("2026-07-20T18:00:00Z")), true);
  assert.equal(sameLocalDay(now, new Date("2026-07-20T21:00:00Z")), false);
});
