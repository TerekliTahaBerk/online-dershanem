import assert from "node:assert/strict";
import test from "node:test";
import { aggregateOutcomeScores, scoreAttempt } from "./scoring";

/**
 * P0-1 (docs/roadmaps/odk-exam-experience-overhaul.md): negatif bölüm netinin
 * kırpılması puanlama politikasından (`minimumNetIsZero`) gelir; ham net her
 * durumda saklanır ve toplamlar ayrı tutulur.
 */

const official = (sectionId: string, count: number) =>
  Array.from({ length: count }, (_, index) => ({ sectionId, questionNumber: index + 1, correctOption: "A" }));
const answers = (sectionId: string, correct: number, wrong: number) => [
  ...Array.from({ length: correct }, (_, index) => ({ sectionId, questionNumber: index + 1, selectedOption: "A" })),
  ...Array.from({ length: wrong }, (_, index) => ({ sectionId, questionNumber: correct + index + 1, selectedOption: "B" })),
];

// TYT örneği: Türkçe 10D/30Y (ham 2.5), Sosyal 0D/20Y (ham −5).
const sections = [
  { id: "tr", title: "Türkçe", questionCount: 40 },
  { id: "sos", title: "Sosyal Bilimler", questionCount: 20 },
];
const key = [...official("tr", 40), ...official("sos", 20)];
const student = [...answers("tr", 10, 30), ...answers("sos", 0, 20)];

test("varsayılan politika (minimumNetIsZero) bölüm netini sıfırda keser ama ham neti saklar", () => {
  const result = scoreAttempt(sections, key, student, 4);
  const sos = result.sectionScores.find((row) => row.sectionId === "sos")!;
  assert.equal(sos.net, 0);
  assert.equal(sos.rawNet, -5);
  assert.equal(result.totalNet, 2.5);
  assert.equal(result.rawTotalNet, -2.5);
  assert.equal(result.minimumNetIsZero, true);
});

test("minimumNetIsZero=false iken negatif bölüm neti korunur ve toplama yansır", () => {
  const result = scoreAttempt(sections, key, student, 4, { minimumNetIsZero: false });
  const sos = result.sectionScores.find((row) => row.sectionId === "sos")!;
  assert.equal(sos.net, -5);
  assert.equal(sos.rawNet, -5);
  assert.equal(result.totalNet, -2.5);
  assert.equal(result.rawTotalNet, -2.5);
  assert.equal(result.minimumNetIsZero, false);
});

test("toplam net her zaman raporlanan bölüm netlerinin toplamıdır", () => {
  for (const minimumNetIsZero of [true, false]) {
    const result = scoreAttempt(sections, key, student, 4, { minimumNetIsZero });
    const sum = Math.round(result.sectionScores.reduce((total, row) => total + row.net, 0) * 100) / 100;
    assert.equal(result.totalNet, sum);
  }
});

test("LGS 3 yanlış 1 doğru: ham net kesirli ve doğru yuvarlanır", () => {
  const result = scoreAttempt([{ id: "mat", title: "Matematik", questionCount: 20 }], official("mat", 20), answers("mat", 1, 5), 3, { minimumNetIsZero: false });
  assert.equal(result.sectionScores[0].rawNet, -0.67);
  assert.equal(result.totalNet, -0.67);
});

test("kazanım özeti soru sürelerini (aktif süre) kazanıma taşır", () => {
  const result = aggregateOutcomeScores([
    { result: "CORRECT", outcomeIds: ["denklem"], activeDurationMs: 40_000 },
    { result: "WRONG", outcomeIds: ["denklem", "oran"], activeDurationMs: 65_000 },
    { result: "BLANK", outcomeIds: ["oran"], activeDurationMs: 0 },
  ]);
  assert.equal(result.find((row) => row.outcomeId === "denklem")?.activeDurationMs, 105_000);
  assert.equal(result.find((row) => row.outcomeId === "oran")?.activeDurationMs, 65_000);
});

test("süre verisi verilmezse kazanım özeti eski biçimini korur", () => {
  const [row] = aggregateOutcomeScores([{ result: "CORRECT", outcomeIds: ["oran"] }]);
  assert.equal("activeDurationMs" in row, false);
});
