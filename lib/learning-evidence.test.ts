import assert from "node:assert/strict";
import test from "node:test";
import { summarizeLearningEvidence, type LearningEvidenceRow } from "./learning-evidence";

const now = new Date("2026-07-19T12:00:00Z");
function row(outcomeId: string, type: LearningEvidenceRow["type"], daysAgo: number): LearningEvidenceRow { return { outcomeId, code: outcomeId, title: `Kazanım ${outcomeId}`, subject: "Matematik", unit: "Sayılar", skills: ["Problem çözme"], type, occurredAt: new Date(now.getTime() - daysAgo * 86400000), source: "LESSON" }; }

test("aynı kazanımın kanıtlarını tek, en güncel kayıtta toplar", () => {
  const result = summarizeLearningEvidence([row("K1", "TAUGHT", 3), row("K1", "INDEPENDENT", 1)], now);
  assert.equal(result.thisWeek.length, 1);
  assert.equal(result.thisWeek[0].type, "INDEPENDENT");
  assert.equal(result.thisWeek[0].evidenceCount, 2);
});

test("yalnız öğretmenin tekrar gerekli dediği en güncel kazanımı tekrar odağı yapar", () => {
  const result = summarizeLearningEvidence([row("K1", "NEEDS_REVIEW", 1), row("K2", "TAUGHT", 1), row("K3", "NEEDS_REVIEW", 2)], now);
  assert.deepEqual(result.reviewNext.map((item) => item.outcomeId), ["K1", "K3"]);
});

test("eski kanıt haftalık görünümü şişirmez", () => {
  assert.equal(summarizeLearningEvidence([row("K1", "TAUGHT", 10)], now).thisWeek.length, 0);
});
