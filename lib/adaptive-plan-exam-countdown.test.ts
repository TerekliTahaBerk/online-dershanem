import assert from "node:assert/strict";
import test from "node:test";

import {
  EXAM_COUNTDOWN_MAX_MINUTES_PER_DAY,
  EXAM_COUNTDOWN_MAX_TASKS_PER_DAY,
  examCountdownCapacity,
  examCountdownWeeks,
} from "./adaptive-plan";

const NOW = new Date("2026-03-10T09:00:00.000Z");
const BASE = { minutesPerDay: 60, maxTasksPerDay: 3 };
const inDays = (days: number) => new Date(NOW.getTime() + days * 86_400_000);

test("sınav tarihi yoksa veya geçmişse geri sayım yoktur", () => {
  assert.equal(examCountdownWeeks(NOW, null), null);
  assert.equal(examCountdownWeeks(NOW, undefined), null);
  assert.equal(examCountdownWeeks(NOW, inDays(-1)), null);
  assert.equal(examCountdownWeeks(NOW, inDays(14)), 2);
});

test("sınav yoksa taban kapasite aynen döner", () => {
  const capacity = examCountdownCapacity({ now: NOW, examAt: null, ...BASE });
  assert.equal(capacity.tier, "NONE");
  assert.equal(capacity.weeksRemaining, null);
  assert.equal(capacity.minutesPerDay, 60);
  assert.equal(capacity.maxTasksPerDay, 3);
});

test("uzak sınav kapasiteyi değiştirmez", () => {
  const capacity = examCountdownCapacity({ now: NOW, examAt: inDays(120), ...BASE });
  assert.equal(capacity.tier, "FAR");
  assert.equal(capacity.minutesPerDay, 60);
  assert.equal(capacity.maxTasksPerDay, 3);
});

test("sınav yaklaştıkça kapasite kademeli artar", () => {
  const approaching = examCountdownCapacity({ now: NOW, examAt: inDays(42), ...BASE });
  assert.equal(approaching.tier, "APPROACHING");
  assert.equal(approaching.minutesPerDay, 69); // 60 × 1.15
  assert.equal(approaching.maxTasksPerDay, 3); // görev sayısı henüz artmaz

  // Sözleşme: sınava 4 haftadan az kaldıysa GÜNLÜK GÖREV SAYISI artar.
  const near = examCountdownCapacity({ now: NOW, examAt: inDays(21), ...BASE });
  assert.equal(near.tier, "NEAR");
  assert.equal(near.minutesPerDay, 78); // 60 × 1.3
  assert.equal(near.maxTasksPerDay, 4);

  const finalWeek = examCountdownCapacity({ now: NOW, examAt: inDays(4), ...BASE });
  assert.equal(finalWeek.tier, "FINAL_WEEK");
  assert.equal(finalWeek.minutesPerDay, 90); // 60 × 1.5
  assert.equal(finalWeek.maxTasksPerDay, 4);
});

test("kapasite artışı üst sınırları aşmaz — geri sayım insanüstü bir gün üretmez", () => {
  const capacity = examCountdownCapacity({
    now: NOW,
    examAt: inDays(2),
    minutesPerDay: 180,
    maxTasksPerDay: 5,
  });
  assert.equal(capacity.minutesPerDay, EXAM_COUNTDOWN_MAX_MINUTES_PER_DAY);
  assert.equal(capacity.maxTasksPerDay, EXAM_COUNTDOWN_MAX_TASKS_PER_DAY);
});

test("kapasite hiçbir kademede düşmez", () => {
  for (const days of [1, 4, 10, 21, 40, 60, 120, 400]) {
    const capacity = examCountdownCapacity({ now: NOW, examAt: inDays(days), ...BASE });
    assert.ok(capacity.minutesPerDay >= BASE.minutesPerDay, `gün ${days}: dakika düştü`);
    assert.ok(capacity.maxTasksPerDay >= BASE.maxTasksPerDay, `gün ${days}: görev düştü`);
  }
});
