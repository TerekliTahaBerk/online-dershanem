import assert from "node:assert/strict";
import test from "node:test";
import { fillBookletPages, keyToAnswerAction, questionVisible, sectionProgress } from "./question-workbench";

/** Faz 4 — soru tablosu: arama, bölüm sekmesi, eksik filtreleri, optik klavye, toplu sayfa. */

const q = (id: string, sectionCode: string, questionNumber: number, patch: Partial<{ correctOption: "A" | null; outcomeIds: string[]; primaryOutcomeId: string | null; contentText: string | null }> = {}) => ({
  id, sectionCode, questionNumber, correctOption: "A" as "A" | null, outcomeIds: ["o1"], primaryOutcomeId: "o1" as string | null, contentText: null as string | null, ...patch,
});
const labels = new Map([["o1", "MAT.8.1 Köklü ifadeler"], ["o2", "FEN.1 Kuvvet"]]);

test("bölüm sekmesi ve eksik filtreleri birlikte uygulanır", () => {
  const rows = [q("a", "MAT", 1), q("b", "MAT", 2, { correctOption: null }), q("c", "FEN", 1, { outcomeIds: [], primaryOutcomeId: null })];
  const visible = (state: Parameters<typeof questionVisible>[1]) => rows.filter((row) => questionVisible(row, state, labels)).map((row) => row.id);
  assert.deepEqual(visible({ filter: "tumu", section: null, search: "" }), ["a", "b", "c"]);
  assert.deepEqual(visible({ filter: "anahtarsiz", section: null, search: "" }), ["b"]);
  assert.deepEqual(visible({ filter: "kazanimsiz", section: null, search: "" }), ["c"]);
  assert.deepEqual(visible({ filter: "tumu", section: "MAT", search: "" }), ["a", "b"]);
});

test("arama: soru numarası, 'BÖLÜM numara', kazanım metni (Türkçe duyarsız)", () => {
  const rows = [q("a", "MAT", 12), q("b", "FEN", 12, { outcomeIds: ["o2"], primaryOutcomeId: "o2" }), q("c", "MAT", 3, { contentText: "Üçgende açı", outcomeIds: ["o2"], primaryOutcomeId: "o2" })];
  const visible = (search: string) => rows.filter((row) => questionVisible(row, { filter: "tumu", section: null, search }, labels)).map((row) => row.id);
  assert.deepEqual(visible("12"), ["a", "b"]);
  assert.deepEqual(visible("fen 12"), ["b"]);
  assert.deepEqual(visible("köklü"), ["a"]);
  assert.deepEqual(visible("KOKLU"), ["a"]);
  assert.deepEqual(visible("ucgen"), ["c"]);
});

test("bölüm ilerlemesi: cevaplı ve kazanımlı sayıları", () => {
  const progress = sectionProgress([q("a", "MAT", 1), q("b", "MAT", 2, { correctOption: null, outcomeIds: [], primaryOutcomeId: null }), q("c", "FEN", 1)]);
  assert.deepEqual(progress, [
    { sectionCode: "MAT", total: 2, answered: 1, withOutcome: 1 },
    { sectionCode: "FEN", total: 1, answered: 1, withOutcome: 1 },
  ]);
});

test("optik klavye: a–e seçer ve ilerler, Backspace/Delete temizler, oklar gezer", () => {
  assert.deepEqual(keyToAnswerAction("c"), { type: "set", option: "C", advance: true });
  assert.deepEqual(keyToAnswerAction("E"), { type: "set", option: "E", advance: true });
  assert.deepEqual(keyToAnswerAction("Backspace"), { type: "clear" });
  assert.deepEqual(keyToAnswerAction("Delete"), { type: "clear" });
  assert.deepEqual(keyToAnswerAction("ArrowDown"), { type: "move", delta: 1 });
  assert.deepEqual(keyToAnswerAction("ArrowUp"), { type: "move", delta: -1 });
  assert.equal(keyToAnswerAction("f"), null);
  assert.equal(keyToAnswerAction("Tab"), null);
});

test("toplu PDF sayfası: seçili sorulara sırayla, sayfa başına N soru", () => {
  const ids = ["q1", "q2", "q3", "q4", "q5"];
  assert.deepEqual([...fillBookletPages(ids, new Set(["q1", "q2", "q4", "q5"]), 3, 2)], [["q1", 3], ["q2", 3], ["q4", 4], ["q5", 4]]);
  assert.deepEqual([...fillBookletPages(ids, new Set(ids), 1, 0)], []);
});
