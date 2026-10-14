import assert from "node:assert/strict";
import test from "node:test";
import { inTrack, normalizeSectionBreakdown, resultTrackView, trackTotals } from "./student-result-view";

/** P0-11 / Faz 3 (docs/roadmaps/odk-exam-experience-overhaul.md). */

test("eski puan satırlarında eksik bölüm kodu sürümün bölümlerinden tamamlanır", () => {
  const rows = normalizeSectionBreakdown(
    [{ sectionId: "s1", title: "Matematik", net: 10 }, { sectionId: "s2", code: "FEN", title: "Fen", net: 5 }, "bozuk", null],
    new Map([["s1", "MAT"], ["s2", "YANLIS"]]),
  );
  assert.deepEqual(rows.map((row) => row.code), ["MAT", "FEN"]);
});

test("AYT sayısal öğrenci: alan görünümü yalnız MAT ve FEN'i sayar, eşit ağırlık EDB_SOS1 + MAT", () => {
  const rows = normalizeSectionBreakdown(
    [
      { sectionId: "a", title: "TDE-SB1", correct: 10, wrong: 4, blank: 26, net: 9 },
      { sectionId: "b", title: "SB2", correct: 0, wrong: 0, blank: 40, net: 0 },
      { sectionId: "c", title: "Mat", correct: 30, wrong: 4, blank: 6, net: 29 },
      { sectionId: "d", title: "Fen", correct: 20, wrong: 8, blank: 12, net: 18 },
    ],
    new Map([["a", "EDB_SOS1"], ["b", "SOS2"], ["c", "MAT"], ["d", "FEN"]]),
  );
  const say = resultTrackView("AYT", "say");
  assert.deepEqual(rows.filter((row) => inTrack(say, row.code)).map((row) => row.code), ["MAT", "FEN"]);
  // Çözülmesi beklenmeyen Sosyal-2'nin 40 boşu sayısal öğrencinin "boş"una yazılmaz.
  assert.deepEqual(trackTotals(rows, say), { correct: 50, wrong: 12, blank: 18, net: 47 });
  assert.deepEqual(trackTotals(rows, resultTrackView("AYT", "EA")), { correct: 40, wrong: 8, blank: 32, net: 38 });
  assert.equal(trackTotals(rows, resultTrackView("TYT", "SAY")), null);
});
