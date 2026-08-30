import assert from "node:assert/strict";
import test from "node:test";
import { buildInterventionSignals, interventionWindowStart } from "./intervention-rules";

test("müdahale değerlendirme penceresi pazartesi başlar", () => {
  assert.equal(interventionWindowStart(new Date("2026-07-19T12:00:00Z")).toISOString(), "2026-07-12T21:00:00.000Z");
});

test("tek günlük dalgalanma vaka üretmez", () => {
  assert.deepEqual(buildInterventionSignals({ attendanceAbsentCount: 1, attendanceTotalCount: 3, overdueWorkCount: 1, repeatedDifficultyCount: 0, stalledPlanTaskCount: 2 }), []);
});

test("yalnız açıklanabilir eşikler kontrollü küçük eylem üretir", () => {
  const rows = buildInterventionSignals({ attendanceAbsentCount: 2, attendanceTotalCount: 4, overdueWorkCount: 2, repeatedDifficultyCount: 1, stalledPlanTaskCount: 3 });
  assert.deepEqual(rows.map((row) => row.reasonCode), ["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED"]);
  const text = rows.map((row) => `${row.explanation} ${row.suggestedAction}`).join(" ").toLocaleLowerCase("tr-TR");
  for (const forbidden of ["riskli", "tembel", "başarısız", "motivasyonsuz", "sıralama"]) assert.equal(text.includes(forbidden), false);
  assert.match(rows[0].explanation, /çıkarım yapılmadı/);
});
