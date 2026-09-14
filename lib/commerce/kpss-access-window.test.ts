import assert from "node:assert/strict";
import test from "node:test";

import { mergeAccessWindow, parseExamAccessWindow } from "./kpss-access-window";

const paidAt = new Date("2026-09-14T10:00:00.000Z");

test("KPSS penceresi ödeme anından snapshot'taki accessEndsAt'e kadar açılır", () => {
  const result = parseExamAccessWindow({ accessEndsAt: "2027-07-12T21:00:00.000Z" }, paidAt);
  assert.deepEqual(result, { ok: true, window: { startsAt: paidAt, expiresAt: new Date("2027-07-12T21:00:00.000Z") } });
});

test("pencere tarihi eksik/bozuksa süresiz üyeliğe düşmez, hata döner", () => {
  assert.deepEqual(parseExamAccessWindow(null, paidAt), { ok: false, reason: "SNAPSHOT_INVALID" });
  assert.deepEqual(parseExamAccessWindow([], paidAt), { ok: false, reason: "SNAPSHOT_INVALID" });
  assert.deepEqual(parseExamAccessWindow({}, paidAt), { ok: false, reason: "ACCESS_END_MISSING" });
  assert.deepEqual(parseExamAccessWindow({ accessEndsAt: "" }, paidAt), { ok: false, reason: "ACCESS_END_MISSING" });
  assert.deepEqual(parseExamAccessWindow({ accessEndsAt: 1_800_000_000_000 }, paidAt), { ok: false, reason: "ACCESS_END_INVALID" });
  assert.deepEqual(parseExamAccessWindow({ accessEndsAt: "sınava kadar" }, paidAt), { ok: false, reason: "ACCESS_END_INVALID" });
  assert.deepEqual(parseExamAccessWindow({ accessEndsAt: "2026-09-14T10:00:00.000Z" }, paidAt), { ok: false, reason: "ACCESS_END_NOT_AFTER_PAYMENT" });
});

test("ikinci satın alma pencereyi daraltmaz; süresiz üyelik süresiz kalır", () => {
  const next = { startsAt: paidAt, expiresAt: new Date("2027-01-01T00:00:00.000Z") };
  assert.deepEqual(mergeAccessWindow(null, next), next);
  assert.deepEqual(
    mergeAccessWindow({ startsAt: new Date("2026-01-01T00:00:00.000Z"), expiresAt: new Date("2027-06-01T00:00:00.000Z") }, next),
    { startsAt: new Date("2026-01-01T00:00:00.000Z"), expiresAt: new Date("2027-06-01T00:00:00.000Z") },
  );
  assert.deepEqual(mergeAccessWindow({ startsAt: new Date("2027-01-01T00:00:00.000Z"), expiresAt: null }, next), { startsAt: paidAt, expiresAt: null });
});
