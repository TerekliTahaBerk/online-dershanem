import assert from "node:assert/strict";
import test from "node:test";
import { lessonReminderRange } from "./lesson-reminder-window";
test("ders hatırlatma penceresi 24 ve 1 saat için cron aralığı kadar geriye bakar", () => {
  const now = new Date("2026-10-02T09:00:00Z");
  assert.deepEqual(lessonReminderRange(now, 24), { gt: new Date("2026-10-03T08:45:00Z"), lte: new Date("2026-10-03T09:00:00Z") });
  assert.deepEqual(lessonReminderRange(now, 1), { gt: new Date("2026-10-02T09:45:00Z"), lte: new Date("2026-10-02T10:00:00Z") });
});
