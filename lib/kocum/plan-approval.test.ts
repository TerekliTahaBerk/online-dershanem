import assert from "node:assert/strict";
import test from "node:test";

import {
  canRegeneratePlan,
  initialPlanApprovalState,
  planAcceptsManualApproval,
} from "./plan-approval";

const NOW = new Date("2026-03-10T09:00:00.000Z");

test("onay gerektiren üründe (OK) plan TASLAK doğar ve onay alanları boştur", () => {
  const state = initialPlanApprovalState({ requiresPlanApproval: true }, NOW);
  assert.equal(state.status, "DRAFT");
  assert.equal(state.approvedById, null);
  assert.equal(state.approvedAt, null);
  assert.equal(state.autoApproved, false);
});

test("onay gerektirmeyen üründe (KPSS) plan onaylı doğar, ama kimse onaylamış görünmez", () => {
  const state = initialPlanApprovalState({ requiresPlanApproval: false }, NOW);
  assert.equal(state.status, "APPROVED");
  assert.equal(state.autoApproved, true);
  assert.deepEqual(state.approvedAt, NOW);
  // Sahte bir onaylayan kimliği yazmak denetim kaydını yalan söyletirdi.
  assert.equal(state.approvedById, null);
});

test("koç onaylı OK planı kilitlidir; otomatik onaylı plan yeniden üretilebilir", () => {
  assert.equal(canRegeneratePlan({ status: "APPROVED", autoApproved: false }), false);
  assert.equal(canRegeneratePlan({ status: "APPROVED", autoApproved: true }), true);
  assert.equal(canRegeneratePlan({ status: "DRAFT", autoApproved: false }), true);
  assert.equal(canRegeneratePlan({ status: "CHANGE_REQUESTED", autoApproved: false }), true);
});

test("onay ucu yalnız onay gerektiren ürünlerde anlamlıdır", () => {
  assert.equal(planAcceptsManualApproval({ requiresPlanApproval: true }), true);
  assert.equal(planAcceptsManualApproval({ requiresPlanApproval: false }), false);
});
