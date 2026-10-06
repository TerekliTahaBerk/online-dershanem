import assert from "node:assert/strict";
import test from "node:test";

import { classifyOdMembership } from "./od-membership-audit";

const purchase = { source: "PURCHASE", sourceOdOrderId: "order-1" };

test("P0-5 denetim: OD satırı olmayan satırlı sipariş ve başka kanıt yok → aday", () => {
  for (const lineProducts of [["OK"], ["ODK"], ["OK", "ODK"]]) {
    assert.equal(classifyOdMembership({ membership: purchase, sourceOrder: { lineProducts }, otherOdEvidenceOrderIds: [] }), "CANDIDATE", lineProducts.join("+"));
  }
});

test("P0-5 denetim: belirsiz veya meşru satırlar aday sayılmaz", () => {
  assert.equal(classifyOdMembership({ membership: purchase, sourceOrder: { lineProducts: ["OD", "OK"] }, otherOdEvidenceOrderIds: [] }), "HAS_OD_LINE");
  assert.equal(classifyOdMembership({ membership: purchase, sourceOrder: { lineProducts: [] }, otherOdEvidenceOrderIds: [] }), "LEGACY_LINELESS_ORDER");
  assert.equal(classifyOdMembership({ membership: purchase, sourceOrder: { lineProducts: ["OK"] }, otherOdEvidenceOrderIds: ["order-2"] }), "OD_EVIDENCE_ELSEWHERE");
  assert.equal(classifyOdMembership({ membership: { source: "MANUAL", sourceOdOrderId: "order-1" }, sourceOrder: { lineProducts: ["OK"] }, otherOdEvidenceOrderIds: [] }), "NOT_PURCHASE");
  assert.equal(classifyOdMembership({ membership: { source: "PURCHASE", sourceOdOrderId: null }, sourceOrder: null, otherOdEvidenceOrderIds: [] }), "SOURCE_ORDER_UNKNOWN");
});
