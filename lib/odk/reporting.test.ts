import assert from "node:assert/strict";
import test from "node:test";
import { buildOutcomeTrends } from "./reporting";

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
