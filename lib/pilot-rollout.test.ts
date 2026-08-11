import assert from "node:assert/strict";
import test from "node:test";
import { calculatePilotReadiness, pilotAccessDecision, pilotTransitionAllowed } from "./pilot-rollout";

test("pilot erişimi admini kilitlemez; kill switch diğer rolleri keser", () => {
  assert.equal(pilotAccessDecision({ role: "ADMIN", activeMembership: false, env: { PANEL_ROLLOUT_MODE: "pilot", PANEL_PILOT_KILL_SWITCH: "true" } }).allowed, true);
  assert.deepEqual(pilotAccessDecision({ role: "STUDENT", activeMembership: true, env: { PANEL_ROLLOUT_MODE: "pilot", PANEL_PILOT_KILL_SWITCH: "true" } }), { allowed: false, reason: "KILL_SWITCH" });
  assert.equal(pilotAccessDecision({ role: "PARENT", activeMembership: false, env: { PANEL_ROLLOUT_MODE: "general" } }).allowed, true);
});

test("pilot modunda yalnız aktif kohort üyesi geçer", () => {
  assert.equal(pilotAccessDecision({ role: "TEACHER", activeMembership: true, env: { PANEL_ROLLOUT_MODE: "pilot" } }).allowed, true);
  assert.equal(pilotAccessDecision({ role: "TEACHER", activeMembership: false, env: { PANEL_ROLLOUT_MODE: "pilot" } }).allowed, false);
});

test("readiness dört rol, bayrak eşliği ve operasyon onaylarını zorunlu tutar", () => {
  const env = { PANEL_ROLLOUT_MODE: "pilot", PANEL_FEATURE_BASELINE_METRICS: "true", PANEL_FEATURE_STUDENT_CHECK_IN: "true", PANEL_PILOT_ACCEPTANCE_APPROVED: "true", PANEL_PILOT_SECURITY_REVIEW_APPROVED: "true", PANEL_LAST_RESTORE_DRILL_AT: "2026-07-01" };
  const ready = calculatePilotReadiness({ env, roles: ["ADMIN", "TEACHER", "STUDENT", "PARENT"], sloMetrics: [], now: new Date("2026-07-20") });
  assert.equal(ready.canActivate, true);
  const blocked = calculatePilotReadiness({ env, roles: ["ADMIN", "TEACHER", "STUDENT"], sloMetrics: [], now: new Date("2026-07-20") });
  assert.equal(blocked.canActivate, false);
  assert.equal(blocked.checks.filter((item) => item.status === "BLOCK").length, 1);
});

test("terminal pilot durumları yeniden açılamaz", () => {
  assert.equal(pilotTransitionAllowed("DRAFT", "ACTIVATE"), true);
  assert.equal(pilotTransitionAllowed("ACTIVE", "PAUSE"), true);
  assert.equal(pilotTransitionAllowed("PAUSED", "RESUME"), true);
  assert.equal(pilotTransitionAllowed("COMPLETED", "ACTIVATE"), false);
  assert.equal(pilotTransitionAllowed("ROLLED_BACK", "RESUME"), false);
});
