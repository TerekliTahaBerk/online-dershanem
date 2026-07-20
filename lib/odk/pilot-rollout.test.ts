import assert from "node:assert/strict";
import test from "node:test";
import { calculateOdkPilotReadiness, odkPilotAccessDecision, odkPilotTransitionAllowed } from "./pilot-rollout";

const snapshot = { readyExamCount: 1, staleAttemptCount: 0, unscoredEndedExamCount: 0, lifecycleCronConfigured: true, privateStorageConfigured: true };
const env = { ODK_ROLLOUT_MODE: "pilot", ODK_PILOT_KILL_SWITCH: "false", ODK_PILOT_ACCEPTANCE_APPROVED: "true", ODK_PILOT_SECURITY_REVIEW_APPROVED: "true", ODK_PILOT_OPERATIONS_APPROVED: "true", ODK_LAST_RESTORE_DRILL_AT: "2026-07-01" };

test("ODK kill switch admini kilitlemeden diğer rolleri keser", () => {
  assert.equal(odkPilotAccessDecision({ role: "ADMIN", activeMembership: false, env: { ODK_ROLLOUT_MODE: "pilot", ODK_PILOT_KILL_SWITCH: "true" } }).allowed, true);
  assert.deepEqual(odkPilotAccessDecision({ role: "STUDENT", activeMembership: true, env: { ODK_ROLLOUT_MODE: "pilot", ODK_PILOT_KILL_SWITCH: "true" } }), { allowed: false, reason: "KILL_SWITCH" });
});

test("ODK pilot aktivasyonu dört rol ve operasyon kapılarını zorunlu tutar", () => {
  const ready = calculateOdkPilotReadiness({ env, roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"], snapshot, now: new Date("2026-07-20") });
  assert.equal(ready.canActivate, true);
  const blocked = calculateOdkPilotReadiness({ env, roles: ["ADMIN", "TEACHER", "STUDENT"], snapshot: { ...snapshot, privateStorageConfigured: false }, now: new Date("2026-07-20") });
  assert.equal(blocked.canActivate, false);
  assert.equal(blocked.checks.filter((check) => check.status === "BLOCK").length, 2);
});

test("eski heartbeat aktivasyonu durdurur, birikmiş puanlama yalnız genişlemeyi bekletir", () => {
  const stale = calculateOdkPilotReadiness({ env, roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"], snapshot: { ...snapshot, staleAttemptCount: 1 }, now: new Date("2026-07-20") });
  assert.equal(stale.canActivate, false);
  const waiting = calculateOdkPilotReadiness({ env, roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"], snapshot: { ...snapshot, unscoredEndedExamCount: 1 }, now: new Date("2026-07-20") });
  assert.equal(waiting.canActivate, true);
  assert.equal(waiting.canExpand, false);
});

test("ODK pilot terminal durumları yeniden açılamaz", () => {
  assert.equal(odkPilotTransitionAllowed("DRAFT", "ACTIVATE"), true);
  assert.equal(odkPilotTransitionAllowed("ACTIVE", "PAUSE"), true);
  assert.equal(odkPilotTransitionAllowed("COMPLETED", "ACTIVATE"), false);
});
