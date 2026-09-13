import assert from "node:assert/strict";
import test from "node:test";
import { buildOutcomeTrends, buildWeakOutcomeSignals } from "./reporting";

test("kazanım eğilimi yalnız öğrencinin ardışık kendi sonuçlarını karşılaştırır", () => {
  const rows = [
    { examId: "e1", takenAt: new Date("2026-01-01"), outcomeId: "o1", code: "M.1", title: "Denklemler", unitName: "Cebir", questionCount: 2, accuracyRate: 25 },
    { examId: "e2", takenAt: new Date("2026-02-01"), outcomeId: "o1", code: "M.1", title: "Denklemler", unitName: "Cebir", questionCount: 3, accuracyRate: 75 },
  ];
  assert.deepEqual(buildOutcomeTrends(rows), [{ outcomeId: "o1", code: "M.1", title: "Denklemler", unitName: "Cebir", latestAccuracy: 75, previousAccuracy: 25, delta: 50, evidenceCount: 2, questionCount: 5 }]);
});

test("tek ölçümde yapay gelişim iddiası üretilmez", () => {
  const [trend] = buildOutcomeTrends([{ examId: "e1", takenAt: new Date("2026-01-01"), outcomeId: "o1", code: "M.1", title: "Denklemler", unitName: "Cebir", questionCount: 1, accuracyRate: 100 }]);
  assert.equal(trend.delta, null);
  assert.equal(trend.previousAccuracy, null);
});

test("zayıf kazanım sinyali geçmiş ölçümü ve kanıt yoğunluğunu birlikte kullanır", () => {
  const trends = buildOutcomeTrends([
    { examId: "e1", takenAt: new Date("2026-01-01"), outcomeId: "o1", code: "M.1", title: "Fonksiyonlar", unitName: "Cebir", questionCount: 3, accuracyRate: 70 },
    { examId: "e2", takenAt: new Date("2026-02-01"), outcomeId: "o1", code: "M.1", title: "Fonksiyonlar", unitName: "Cebir", questionCount: 4, accuracyRate: 35 },
  ]);
  const [signal] = buildWeakOutcomeSignals({
    latestScores: [{ outcomeId: "o1", code: "M.1", title: "Fonksiyonlar", unitName: "Cebir", questionCount: 4, accuracyRate: 35 }],
    trends,
  });
  assert.equal(signal.needsReview, true);
  assert.equal(signal.evidenceCount, 2);
  assert.equal(signal.questionCount, 7);
  assert.ok(signal.priority >= 40);
});

test("tek ölçüm ve az soruda güven düşük işaretlenir", () => {
  const trends = buildOutcomeTrends([
    { examId: "e1", takenAt: new Date("2026-02-01"), outcomeId: "o1", code: "M.1", title: "Fonksiyonlar", unitName: "Cebir", questionCount: 1, accuracyRate: 0 },
  ]);
  const [signal] = buildWeakOutcomeSignals({
    latestScores: [{ outcomeId: "o1", code: "M.1", title: "Fonksiyonlar", unitName: "Cebir", questionCount: 1, accuracyRate: 0 }],
    trends,
  });
  assert.equal(signal.confidence, "LOW");
  assert.equal(signal.evidenceCount, 1);
  assert.equal(signal.needsReview, false);
});
