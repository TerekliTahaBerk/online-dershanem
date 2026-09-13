import assert from "node:assert/strict";
import test from "node:test";
import { buildTrendCaption, selectLatestSixChronological } from "@/lib/student-progress-trend";
import type { SubjectSeries } from "@/components/panel/student/subject-trend";

test("8 denemeden yalnız son 6 denemeyi seçer ve kronolojik sıralar", () => {
  const base = new Date("2026-01-01T00:00:00.000Z");
  const exams = Array.from({ length: 8 }, (_, i) => ({
    id: `e${i + 1}`,
    takenAt: new Date(base.getTime() + i * 86400000),
  }));
  const selected = selectLatestSixChronological(exams);
  assert.deepEqual(
    selected.map((e) => e.id),
    ["e3", "e4", "e5", "e6", "e7", "e8"],
  );
});

test("eksik ders ölçümü null kalır, gerçek 0 net ile karışmaz", () => {
  const series: SubjectSeries = {
    name: "Matematik",
    color: "#14976B",
    nets: [12.5, null, 0, 10],
  };
  assert.equal(series.nets[1], null);
  assert.equal(series.nets[2], 0);
  assert.notEqual(series.nets[1], series.nets[2]);
});

test("trend caption null noktaları atlayarak ilk-son gerçek ölçümü karşılaştırır", () => {
  const series: SubjectSeries[] = [
    { name: "Matematik", color: "#14976B", nets: [null, 8, null, 10] },
    { name: "Fen", color: "#E0A34A", nets: [null, 5, null, null] },
  ];
  const caption = buildTrendCaption(series);
  assert.equal(caption, "Matematik neti 8 → 10 (yükseldi).");
});
