import assert from "node:assert/strict";
import test from "node:test";
import { buildAdaptiveWeek, planningWeekStart } from "./adaptive-plan";

const candidates = Array.from({ length: 10 }, (_, index) => ({ sourceType: "ASSIGNMENT" as const, sourceReferenceId: `a${index}`, title: `Görev ${index}`, durationMinutes: 20, reasonCode: "DUE_SOON" as const, priority: 100 - index, dueAt: new Date(`2026-07-${20 + index}T00:00:00Z`) }));

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

test("yüksek öncelikli ve yakın tarihli işi önce seçer", () => {
  const tasks = buildAdaptiveWeek({ now: new Date("2026-07-20T10:00:00Z"), availableDays: [1], minutesPerDay: 20, maxTasksPerDay: 1, candidates: [{ ...candidates[0], title: "Düşük", priority: 10 }, { ...candidates[1], title: "Yüksek", priority: 90 }] });
  assert.equal(tasks[0]?.title, "Yüksek");
});
