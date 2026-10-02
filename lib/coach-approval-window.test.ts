import assert from "node:assert/strict";
import test from "node:test";
import { coachApprovalDeadline } from "./coach-approval-window";
test("haftalık koç hatırlatma sınırı İstanbul pazartesi 10.00'dır", () => {
  const before = new Date("2026-10-05T06:59:00Z");
  assert.equal(coachApprovalDeadline(before).toISOString(), "2026-10-05T07:00:00.000Z");
  assert.ok(before < coachApprovalDeadline(before));
  const due = new Date("2026-10-05T07:00:00Z");
  assert.equal(due.getTime(), coachApprovalDeadline(due).getTime());
});
