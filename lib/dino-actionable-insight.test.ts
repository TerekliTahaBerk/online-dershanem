import assert from "node:assert/strict";
import test from "node:test";
import { buildActionableDinoInsight } from "./dino-actionable-insight";

const now = new Date("2026-08-30T10:00:00.000Z");
const review = {
  id: "review-1",
  outcomeId: "outcome-1",
  title: "Köklü ifadeler",
  sourceType: "LESSON_OUTCOME" as const,
  dueAt: new Date("2026-08-29T10:00:00.000Z"),
  latestResponse: "WRONG" as const,
};
const evidence = { outcomeId: "outcome-1", title: "Köklü ifadeler", createdAt: new Date("2026-08-29T08:00:00.000Z") };

test("kanıta bağlı bugünkü plan görevini tek eylem olarak seçer", () => {
  const result = buildActionableDinoInsight({
    now,
    planTasks: [
      { title: "Bağsız görev", durationMinutes: 10, sourceType: "REVIEW", sourceReferenceId: "missing" },
      { title: "Köklü ifadeler tekrarı", durationMinutes: 20, sourceType: "REVIEW", sourceReferenceId: review.id },
    ],
    reviews: [review],
    evidence: [evidence],
  });
  assert.deepEqual(result, {
    insight: "Bugünkü plana başlamak için 20 dk'lık “Köklü ifadeler tekrarı” görevini seç.",
    basis: "Dayanak: öğretmenin derste verdiği “tekrar gerekli” işareti; son tekrar başarısız.",
    target: "PLAN",
  });
});

test("plan görevi yoksa zamanı gelmiş ReviewItem'a yönlendirir", () => {
  const result = buildActionableDinoInsight({ now, planTasks: [], reviews: [review], evidence: [] });
  assert.equal(result?.target, "REVIEW");
  assert.match(result?.insight || "", /15 dakikalık “Köklü ifadeler”/);
  assert.match(result?.basis || "", /son tekrar başarısız/);
});

test("ReviewItem yoksa güncel ders kanıtından eylem üretir", () => {
  const result = buildActionableDinoInsight({ now, planTasks: [], reviews: [], evidence: [evidence] });
  assert.deepEqual(result, {
    insight: "Bugün 20 dakika “Köklü ifadeler” kazanımını tekrar et.",
    basis: "Dayanak: dünkü derste verilen “tekrar gerekli” işareti.",
    target: "REVIEW",
  });
});

test("kanıt yoksa öneri uydurmaz", () => {
  assert.equal(buildActionableDinoInsight({ now, planTasks: [], reviews: [], evidence: [] }), null);
});
