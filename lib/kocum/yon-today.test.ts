import assert from "node:assert/strict";
import { test } from "node:test";
import { buildYonToday, isHighPriority, yonTargetLabel, type YonTask } from "./yon-today";

const key = (date: Date) => date.toISOString().slice(0, 10);

function task(id: string, day: string, overrides: Partial<YonTask> = {}): YonTask {
  return {
    id,
    title: id,
    subject: null,
    topic: null,
    status: "PLANNED",
    scheduledFor: new Date(`${day}T09:00:00.000Z`),
    scheduleMode: "SCHEDULED",
    durationMinutes: 30,
    actualMinutes: null,
    targetType: "NONE",
    targetValue: null,
    priority: "NORMAL",
    ...overrides,
  };
}

const WEEK = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];

test("Yön Bugün: bugünün görevleri, öncelikli gecikenler ve haftalık ilerleme", () => {
  const tasks = [
    task("old-1", "2026-10-05", { scheduledFor: new Date("2026-10-05T08:00:00.000Z") }),
    task("old-2", "2026-10-05", { scheduledFor: new Date("2026-10-05T10:00:00.000Z"), status: "IN_PROGRESS" }),
    task("old-3", "2026-10-04"),
    task("old-4", "2026-10-03"),
    task("old-done", "2026-10-05", { status: "DONE", actualMinutes: 50 }),
    task("today-late", "2026-10-06", { scheduledFor: new Date("2026-10-06T15:00:00.000Z"), durationMinutes: 45 }),
    task("today-early", "2026-10-06", { scheduledFor: new Date("2026-10-06T07:00:00.000Z"), status: "PARTIAL" }),
    task("skipped", "2026-10-06", { status: "SKIPPED" }),
    task("could-not", "2026-10-04", { status: "COULD_NOT" }),
    task("later", "2026-10-08", { durationMinutes: 20 }),
  ];
  const view = buildYonToday(tasks, "2026-10-06", key, WEEK);

  assert.deepEqual(view.today.map((t) => t.id), ["today-early", "today-late"]);
  assert.equal(view.openToday, 1);
  assert.equal(view.remainingMinutesToday, 45);
  // En eskisi önce, en fazla üç; toplam sayı ayrıca tutulur. COULD_NOT gecikmiş sayılmaz.
  assert.deepEqual(view.overdue.map((t) => t.id), ["old-4", "old-3", "old-1"]);
  assert.equal(view.overdueTotal, 4);
  // SKIPPED hariç 9 görev; DONE + PARTIAL tamamlanmış sayılır.
  assert.equal(view.week.total, 9);
  assert.equal(view.week.done, 2);
  assert.equal(view.week.doneMinutes, 50 + 30);
  assert.equal(view.week.plannedMinutes, 30 * 7 + 45 + 20);
  const monday = view.week.days[0];
  assert.deepEqual(monday, { key: "2026-10-05", done: 1, total: 3, isToday: false });
  assert.deepEqual(view.week.days[1], { key: "2026-10-06", done: 1, total: 2, isToday: true });
  assert.equal(view.week.days[6].total, 0);
});

test("Yön Bugün: boş plan sıfırlarla döner", () => {
  const view = buildYonToday([], "2026-10-06", key, WEEK);
  assert.equal(view.today.length, 0);
  assert.equal(view.overdueTotal, 0);
  assert.equal(view.week.total, 0);
  assert.equal(view.week.days.length, 7);
});

test("hedef metni ve öncelik işareti", () => {
  assert.equal(yonTargetLabel({ targetType: "QUESTIONS", targetValue: 40 }), "40 soru");
  assert.equal(yonTargetLabel({ targetType: "MINUTES", targetValue: 29.6 }), "30 dk");
  assert.equal(yonTargetLabel({ targetType: "PAGES", targetValue: 12 }), "12 sayfa");
  assert.equal(yonTargetLabel({ targetType: "VIDEOS", targetValue: 2 }), "2 video");
  assert.equal(yonTargetLabel({ targetType: "NONE", targetValue: 10 }), null);
  assert.equal(yonTargetLabel({ targetType: "QUESTIONS", targetValue: null }), null);
  assert.equal(yonTargetLabel({ targetType: "QUESTIONS", targetValue: 0 }), null);
  assert.equal(isHighPriority({ priority: "HIGH" }), true);
  assert.equal(isHighPriority({ priority: "URGENT" }), true);
  assert.equal(isHighPriority({ priority: "NORMAL" }), false);
});
