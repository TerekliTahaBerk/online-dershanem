import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTodayFocus,
  groupPlanTasksByDay,
  buildWeeklyProgress,
  planStatusLabel,
  splitPlanTasks,
  taskStatusLabel,
  type StudentPlanTask,
} from "./student-plan-view";

test("bugünkü görevleri İstanbul gün sınırına göre ayırır", () => {
  const tasks: StudentPlanTask[] = [
    {
      id: "today",
      scheduledFor: "2026-08-30T21:30:00.000Z", // İstanbul 31 Ağustos 00:30
      durationMinutes: 30,
      status: "PLANNED",
    },
    {
      id: "yesterday",
      scheduledFor: "2026-08-30T20:30:00.000Z", // İstanbul 30 Ağustos 23:30
      durationMinutes: 20,
      status: "PLANNED",
    },
  ];

  const split = splitPlanTasks(tasks, "2026-08-31");
  assert.deepEqual(split.todayPending.map((task) => task.id), ["today"]);
  assert.deepEqual(split.remainingWeek.map((task) => task.id), ["yesterday"]);
});

test("haftalık ilerleme skipped görevleri paydaya katmaz", () => {
  const progress = buildWeeklyProgress([
    { id: "1", scheduledFor: "2026-08-30T09:00:00.000Z", durationMinutes: 30, status: "DONE" },
    { id: "2", scheduledFor: "2026-08-30T10:00:00.000Z", durationMinutes: 30, status: "PLANNED" },
    { id: "3", scheduledFor: "2026-08-30T11:00:00.000Z", durationMinutes: 30, status: "SKIPPED" },
  ]);

  assert.equal(progress.completedCount, 1);
  assert.equal(progress.totalCount, 2);
  assert.equal(progress.remainingCount, 1);
  assert.equal(progress.percent, 50);
});

test("bugünkü odak süreyi yalnız tüm görevlerde varsa gösterir", () => {
  const full = buildTodayFocus([
    { id: "1", scheduledFor: "2026-08-30T09:00:00.000Z", durationMinutes: 20, status: "PLANNED" },
    { id: "2", scheduledFor: "2026-08-30T10:00:00.000Z", durationMinutes: 25, status: "PLANNED" },
  ]);
  assert.equal(full.detail, "45 dk");

  const partial = buildTodayFocus([
    { id: "1", scheduledFor: "2026-08-30T09:00:00.000Z", durationMinutes: 20, status: "PLANNED" },
    { id: "2", scheduledFor: "2026-08-30T10:00:00.000Z", durationMinutes: 0, status: "PLANNED" },
  ]);
  assert.equal(partial.detail, null);
});

test("öğrenciye görünen durum metinleri doğal Türkçedir", () => {
  assert.equal(planStatusLabel("APPROVED"), "Koçun tarafından onaylandı");
  // Otomatik onaylı planda olmayan bir koçun onayından söz edilmez.
  assert.equal(planStatusLabel("APPROVED", { autoApproved: true }), "Planın hazır");
  assert.equal(planStatusLabel("DRAFT", { autoApproved: false }), "Plan hazırlanıyor");
  assert.equal(taskStatusLabel("PLANNED"), "Başlamadım");
  assert.equal(taskStatusLabel("DONE"), "Tamamladım");
  assert.equal(taskStatusLabel("SKIPPED"), "Yeniden planlanacak");
  assert.equal(taskStatusLabel("PARTIAL"), "Kısmen tamamladım");
});

test("Planım liste görünümü görevleri güne göre gruplar; SKIPPED görünmez", () => {
  const mk = (id: string, iso: string, status: "PLANNED" | "DONE" | "PARTIAL" | "SKIPPED" | "COULD_NOT") => ({
    id,
    title: id,
    scheduledFor: iso,
    durationMinutes: 30,
    status,
  });
  const groups = groupPlanTasksByDay(
    [
      mk("b", "2026-10-07T09:00:00.000Z", "PLANNED"),
      mk("a", "2026-10-05T09:00:00.000Z", "DONE"),
      mk("c", "2026-10-07T12:00:00.000Z", "PARTIAL"),
      mk("s", "2026-10-07T13:00:00.000Z", "SKIPPED"),
      mk("d", "2026-10-09T09:00:00.000Z", "COULD_NOT"),
    ] as never[],
    "2026-10-07",
  );
  assert.deepEqual(
    groups.map((g) => [g.key, g.total, g.done, g.isToday, g.isPast]),
    [
      ["2026-10-05", 1, 1, false, true],
      ["2026-10-07", 2, 1, true, false],
      ["2026-10-09", 1, 0, false, false],
    ],
  );
  assert.deepEqual(groupPlanTasksByDay([], "2026-10-07"), []);
});
