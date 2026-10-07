import assert from "node:assert/strict";
import { test } from "node:test";
import { AYT_TRACK_LABEL, aytTrackSections, releasedResultsWithDelta, studentExamState } from "./student-exam-state";

const exam = (overrides: Partial<Parameters<typeof studentExamState>[0]> = {}) => ({
  id: "e1",
  attempts: [],
  startDecision: { ok: false as const, code: "NOT_STARTED" },
  resultAvailable: false,
  ...overrides,
});

test("Deneme Ligi öğrenci durumları tek kaynaktan çıkar", () => {
  assert.deepEqual(studentExamState(exam({ attempts: [{ status: "IN_PROGRESS" }] })), {
    key: "IN_PROGRESS",
    label: "Devam ediyor",
    tone: "warning",
    actionLabel: "Denemeye devam et",
    href: "/panel/odk/ogrenci/denemeler/e1/coz",
    tab: "acik",
  });
  assert.equal(studentExamState(exam({ attempts: [{ status: "SUBMITTED" }] })).key, "WAITING_RESULT");
  const released = studentExamState(exam({ attempts: [{ status: "AUTO_SUBMITTED" }], resultAvailable: true }));
  assert.equal(released.key, "RESULT_RELEASED");
  assert.equal(released.href, "/panel/odk/ogrenci/denemeler/e1/sonuc");
  assert.equal(studentExamState(exam({ startDecision: { ok: true } })).key, "AVAILABLE");
  assert.equal(studentExamState(exam()).tab, "yaklasan");
  assert.equal(studentExamState(exam({ startDecision: { ok: false, code: "EXAM_ENDED" } })).key, "MISSED");
  assert.equal(studentExamState(exam({ startDecision: { ok: false, code: "ENTRY_CLOSED" } })).label, "Kaçırıldı");
  assert.equal(studentExamState(exam({ startDecision: { ok: false, code: "NOT_SCHEDULED" } })).key, "CLOSED");
  // Geçersiz sayılan deneme (VOID) yokmuş gibi değerlendirilir.
  assert.equal(studentExamState(exam({ attempts: [{ status: "VOID" }], startDecision: { ok: true } })).key, "AVAILABLE");
});

test("açıklanan sonuçlar aynı ailedeki önceki sonuca göre fark taşır", () => {
  const rows = releasedResultsWithDelta([
    { examId: "a", title: "TYT 1", family: "TYT", at: new Date("2026-09-01"), net: 60 },
    { examId: "b", title: "AYT 1", family: "AYT", at: new Date("2026-09-08"), net: 30 },
    { examId: "c", title: "TYT 2", family: "TYT", at: new Date("2026-09-15"), net: 63.5 },
  ]);
  assert.deepEqual(rows.map((row) => [row.examId, row.delta]), [["c", 3.5], ["b", null], ["a", null]]);
  assert.deepEqual(releasedResultsWithDelta([]), []);
});

test("AYT alanı bölüm kodlarına eşlenir; DIL ve boş alan tüm bölümleri gösterir", () => {
  assert.deepEqual(aytTrackSections("SAY"), ["MAT", "FEN"]);
  assert.deepEqual(aytTrackSections("ea"), ["MAT", "EDB_SOS1"]);
  assert.deepEqual(aytTrackSections("SOZ"), ["EDB_SOS1", "SOS2"]);
  assert.equal(aytTrackSections("DIL"), null);
  assert.equal(aytTrackSections(null), null);
  assert.equal(AYT_TRACK_LABEL.SAY, "Sayısal");
});
