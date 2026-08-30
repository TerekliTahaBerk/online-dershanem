import assert from "node:assert/strict";
import test from "node:test";
import { buildHumanConcernSignal, buildInterventionSignals, buildStudentSupportEpisode, interventionWindowStart } from "./intervention-rules";

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

test("aynı öğrencinin haftalık sinyalleri tek destek bölümünde toplanır", () => {
  const signals = buildInterventionSignals({ attendanceAbsentCount: 2, attendanceTotalCount: 4, overdueWorkCount: 2, repeatedDifficultyCount: 0, stalledPlanTaskCount: 3 });
  const episode = buildStudentSupportEpisode(signals);

  assert.ok(episode);
  assert.equal(episode.primaryReasonCode, "ATTENDANCE_PATTERN");
  assert.equal(episode.signals.length, 3);
  assert.equal(episode.evidenceCount, 7);
  assert.match(episode.explanation, /3 açıklanabilir sinyal/);
  assert.match(episode.suggestedAction, /birlikte doğrulayın/);
});

test("sinyal yoksa destek bölümü üretilmez", () => {
  assert.equal(buildStudentSupportEpisode([]), null);
});

test("son iki aynı tür denemede en az beş net düşüş kontrollü sinyal üretir", () => {
  const signals = buildInterventionSignals({ attendanceAbsentCount: 0, attendanceTotalCount: 0, overdueWorkCount: 0, repeatedDifficultyCount: 0, stalledPlanTaskCount: 0, recentExamDrop: { previousNet: 63.25, currentNet: 57.75 }, engagementGapDays: 2 });
  assert.equal(signals.length, 1);
  assert.equal(signals[0].reasonCode, "RECENT_EXAM_DROP");
  assert.match(signals[0].explanation, /kalıcı eğilim veya neden çıkarımı yapılmadı/);
});

test("yedi tam günlük panel boşluğu neden uydurmadan sinyal üretir", () => {
  const signals = buildInterventionSignals({ attendanceAbsentCount: 0, attendanceTotalCount: 0, overdueWorkCount: 0, repeatedDifficultyCount: 0, stalledPlanTaskCount: 0, recentExamDrop: null, engagementGapDays: 7 });
  assert.equal(signals.length, 1);
  assert.equal(signals[0].reasonCode, "ENGAGEMENT_GAP");
  assert.match(signals[0].explanation, /7 tam gün/);
});

test("insan concern sinyali serbest metin veya tanı taşımaz", () => {
  const signal = buildHumanConcernSignal();
  assert.equal(signal.reasonCode, "HUMAN_CONCERN");
  assert.equal(signal.evidenceCount, 1);
  assert.match(signal.explanation, /Serbest metin, tanı veya neden çıkarımı kaydedilmedi/);
});
