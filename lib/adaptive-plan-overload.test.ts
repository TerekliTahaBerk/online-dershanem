import assert from "node:assert/strict";
import test from "node:test";
import { getLowerSafeMinutes, getOverloadRequest } from "./adaptive-plan-overload";

test("biraz azalt için bir alt güvenli preset önerir", () => {
  assert.equal(getLowerSafeMinutes(60), 45);
  assert.equal(getLowerSafeMinutes(45), 30);
  assert.equal(getLowerSafeMinutes(20), null);
});

test("overload seçeneklerini mevcut domain kategorilerine map eder", () => {
  assert.deepEqual(getOverloadRequest("REDUCE_LIGHT"), { category: "TOO_MUCH", overwhelmPulse: 4 });
  assert.deepEqual(getOverloadRequest("REDUCE_HEAVY"), { category: "TOO_MUCH", overwhelmPulse: 5 });
  assert.deepEqual(getOverloadRequest("CHANGE_DAYS"), { category: "WRONG_DAYS", overwhelmPulse: 4 });
});
