import assert from "node:assert/strict";
import test from "node:test";
import { aggregateOutcomeScores, scoreAttempt, scoreSubtests } from "./scoring";

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

test("bölüm satırı bölüm kodunu taşır (AYT alan görünümü filtrelemesi için)", () => {
  const result = scoreAttempt([{ id: "s-mat", code: "MAT", title: "Matematik", questionCount: 2 }], official("s-mat", 2), answers("s-mat", 1, 1), 4);
  assert.equal(result.sectionScores[0].code, "MAT");
});

test("alt testler bölüm içi soru aralığından puanlanır; iptal edilen soru sayılmaz; alt test neti ham nettir", () => {
  // Fen 20 soru: Fizik 1–7, Kimya 8–14, Biyoloji 15–20. 3. soru iptal (anahtarda yok).
  const key = official("fen", 20).filter((row) => row.questionNumber !== 3);
  const student = [
    ...[1, 2, 4].map((questionNumber) => ({ sectionId: "fen", questionNumber, selectedOption: "A" })), // fizik 3 doğru
    ...[5, 6, 7, 8].map((questionNumber) => ({ sectionId: "fen", questionNumber, selectedOption: "B" })), // fizik 3 yanlış, kimya 1 yanlış
  ];
  const result = scoreAttempt([{ id: "fen", code: "FEN", title: "Fen", questionCount: 19 }], key, student, 4);
  const subtests = scoreSubtests(result.perQuestion, new Map([["fen", [
    { code: "FIZIK", title: "Fizik", questionCount: 7, questionStart: 1, questionEnd: 7 },
    { code: "KIMYA", title: "Kimya", questionCount: 7, questionStart: 8, questionEnd: 14 },
    { code: "BIYOLOJI", title: "Biyoloji", questionCount: 6, questionStart: 15, questionEnd: 20 },
  ]]]), 4).get("fen")!;
  assert.deepEqual(subtests.map((row) => [row.code, row.questionCount, row.correct, row.wrong, row.blank, row.net]), [
    ["FIZIK", 6, 3, 3, 0, 2.25],
    ["KIMYA", 7, 0, 1, 6, -0.25],
    ["BIYOLOJI", 6, 0, 0, 6, 0],
  ]);
});
