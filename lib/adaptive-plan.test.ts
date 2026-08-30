import assert from "node:assert/strict";
import test from "node:test";
import { ADAPTIVE_SCORE_VERSION, buildAdaptiveWeek, planningWeekStart, scorePlanCandidate } from "./adaptive-plan";

const candidates = Array.from({ length: 10 }, (_, index) => ({ sourceType: "ASSIGNMENT" as const, sourceReferenceId: `a${index}`, title: `Görev ${index}`, durationMinutes: 20, reasonCode: "DUE_SOON" as const, dueAt: new Date(`2026-07-${20 + index}T00:00:00Z`), evidenceAt: new Date("2026-07-19T10:00:00Z") }));

test("plan haftayı pazartesi başlatır", () => {
  assert.equal(planningWeekStart(new Date("2026-07-22T12:00:00Z")).toISOString(), "2026-07-19T21:00:00.000Z");
});

test("pazar günü yeni haftayı hazırlamaya geçer", () => {
  assert.equal(planningWeekStart(new Date("2026-07-19T12:00:00Z")).toISOString(), "2026-07-19T21:00:00.000Z");
});

test("UTC cumartesi olsa da İstanbul'da pazar başladıysa sonraki plan haftasına geçer", () => {
  const istanbulSunday0030 = new Date("2026-07-18T21:30:00.000Z");
  assert.equal(planningWeekStart(istanbulSunday0030).toISOString(), "2026-07-19T21:00:00.000Z");
});

test("günlük üç görev ve dakika kapasitesini aşmaz", () => {
  const tasks = buildAdaptiveWeek({ now: new Date("2026-07-20T10:00:00Z"), availableDays: [1, 3, 5], minutesPerDay: 45, maxTasksPerDay: 3, candidates });
  for (const day of new Set(tasks.map((task) => task.scheduledFor.toISOString()))) {
    const rows = tasks.filter((task) => task.scheduledFor.toISOString() === day);
    assert.ok(rows.length <= 3);
    assert.ok(rows.reduce((sum, task) => sum + task.durationMinutes, 0) <= 45);
  }
  assert.equal(tasks.length, 6);
});

test("kaçan günleri geçmişe veya borç yığınına dönüştürmez", () => {
  const tasks = buildAdaptiveWeek({ now: new Date("2026-07-23T10:00:00Z"), availableDays: [1, 2, 3, 4, 5], minutesPerDay: 40, maxTasksPerDay: 3, candidates });
  assert.ok(tasks.every((task) => task.scheduledFor >= new Date("2026-07-22T21:00:00Z")));
  assert.ok(tasks.filter((task) => task.scheduledFor.toISOString() === "2026-07-22T21:00:00.000Z").length <= 2);
});

test("yakın ve güncel kanıtlı işi eski kanıttan önce seçer", () => {
  const tasks = buildAdaptiveWeek({ now: new Date("2026-07-20T10:00:00Z"), availableDays: [1], minutesPerDay: 20, maxTasksPerDay: 1, candidates: [{ ...candidates[0], title: "Eski kanıt", dueAt: null, evidenceAt: new Date("2026-05-01T10:00:00Z") }, { ...candidates[1], title: "Yeni kanıt", dueAt: null, evidenceAt: new Date("2026-07-19T10:00:00Z") }] });
  assert.equal(tasks[0]?.title, "Yeni kanıt");
});

test("skor bileşenlerini ve insan okunur nedeni sürümleyerek snapshot'lar", () => {
  const scored = scorePlanCandidate({ sourceType: "REVIEW", title: "Kesirler", durationMinutes: 15, reasonCode: "NEEDS_REVIEW", dueAt: new Date("2026-07-17T10:00:00Z"), evidenceAt: new Date("2026-07-19T10:00:00Z"), evidenceCount: 3, latestReviewResponse: "WRONG" }, new Date("2026-07-20T10:00:00Z"));
  assert.equal(scored.scoreVersion, ADAPTIVE_SCORE_VERSION);
  assert.deepEqual(scored.scoreBreakdown.map((item) => item.key), ["source", "urgency", "recency", "confidence", "conflict"]);
  assert.match(scored.explanation, /son derste tekrar gerekiyor \+ son tekrar başarısız \+ 3 gündür bekliyor/);
});

test("çelişen yakın kanıt skoru düşürür ve açıklamada görünür", () => {
  const base = { sourceType: "REVIEW" as const, title: "Denklemler", durationMinutes: 15, reasonCode: "REVIEW_DUE" as const, evidenceAt: new Date("2026-07-19T10:00:00Z"), evidenceCount: 3 };
  const clear = scorePlanCandidate(base, new Date("2026-07-20T10:00:00Z"));
  const conflicted = scorePlanCandidate({ ...base, hasConflictingEvidence: true }, new Date("2026-07-20T10:00:00Z"));
  assert.equal(clear.score - conflicted.score, 14);
  assert.match(conflicted.explanation, /kanıtlar birbiriyle çelişiyor/);
});
