import assert from "node:assert/strict";
import test from "node:test";
import { STUDENT_HELP_SLA_MS, studentCheckInWeekEnd, studentCheckInWeekStart, studentHelpDueAt } from "./student-check-in";

test("check-in haftası İstanbul pazartesi sınırını kullanır", () => {
  assert.equal(studentCheckInWeekStart(new Date("2026-07-20T05:00:00Z")).toISOString(), "2026-07-19T21:00:00.000Z");
  assert.equal(studentCheckInWeekEnd(new Date("2026-07-20T05:00:00Z")).toISOString(), "2026-07-26T21:00:00.000Z");
});

test("pazar gecesi İstanbul'da yeni haftaya geçmez", () => {
  assert.equal(studentCheckInWeekStart(new Date("2026-07-19T20:30:00Z")).toISOString(), "2026-07-12T21:00:00.000Z");
});

test("yardım isteği SLA'sı tam 24 saattir", () => {
  const now = new Date("2026-07-20T10:00:00Z");
  assert.equal(studentHelpDueAt(now).getTime() - now.getTime(), STUDENT_HELP_SLA_MS);
});
