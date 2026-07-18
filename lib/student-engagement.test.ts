import assert from "node:assert/strict";
import test from "node:test";
import { completionDayStreak } from "./student-engagement";

const now = new Date("2026-07-18T12:00:00+03:00");
test("aynı gün birden çok ödev seriyi yalnızca bir artırır", () => {
  assert.equal(completionDayStreak([new Date("2026-07-18T09:00:00+03:00"), new Date("2026-07-18T11:00:00+03:00")], now), 1);
});
test("bugün ve önceki ardışık günleri sayar", () => {
  assert.equal(completionDayStreak([new Date("2026-07-18T09:00:00+03:00"), new Date("2026-07-17T09:00:00+03:00"), new Date("2026-07-16T09:00:00+03:00")], now), 3);
});
test("bugün çalışma yoksa dünle biten seri korunur", () => {
  assert.equal(completionDayStreak([new Date("2026-07-17T09:00:00+03:00"), new Date("2026-07-16T09:00:00+03:00")], now), 2);
});
test("bir günden uzun boşluk seriyi sıfırlar", () => {
  assert.equal(completionDayStreak([new Date("2026-07-15T09:00:00+03:00")], now), 0);
});
