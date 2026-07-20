import assert from "node:assert/strict";
import test from "node:test";
import { aggregateOutcomeScores } from "./scoring";

test("bir soru bağlı olduğu her kazanıma kanıt üretir", () => {
  const result = aggregateOutcomeScores([
    { result: "CORRECT", outcomeIds: ["denklem", "islem"] },
    { result: "WRONG", outcomeIds: ["denklem"] },
    { result: "BLANK", outcomeIds: ["denklem"] },
  ]);
  assert.deepEqual(result.find((item) => item.outcomeId === "denklem"), { outcomeId: "denklem", questionCount: 3, correctCount: 1, wrongCount: 1, blankCount: 1, accuracyRate: 33.33 });
  assert.deepEqual(result.find((item) => item.outcomeId === "islem"), { outcomeId: "islem", questionCount: 1, correctCount: 1, wrongCount: 0, blankCount: 0, accuracyRate: 100 });
});

test("aynı kazanım bir soruda yinelense bile iki kez sayılmaz", () => {
  assert.deepEqual(aggregateOutcomeScores([{ result: "CORRECT", outcomeIds: ["oran", "oran"] }]), [{ outcomeId: "oran", questionCount: 1, correctCount: 1, wrongCount: 0, blankCount: 0, accuracyRate: 100 }]);
});
