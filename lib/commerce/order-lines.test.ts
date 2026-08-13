import assert from "node:assert/strict";
import test from "node:test";
import { allocateOrderDiscount, assertOrderLineReconciliation, isOrderCallbackComplete, refundForQuantity } from "./order-lines";

test("allocates discounts deterministically and reconciles exact cents", () => {
  const lines = allocateOrderDiscount([
    { position: 0, quantity: 1, unitPriceCents: 100 },
    { position: 1, quantity: 1, unitPriceCents: 100 },
    { position: 2, quantity: 1, unitPriceCents: 100 },
  ], 100);
  assert.deepEqual(lines.map((line) => line.discountCents), [34, 33, 33]);
  assertOrderLineReconciliation(lines, { subtotalCents: 300, discountCents: 100, totalCents: 200 });
});

test("supports quantities and prevents over-discounting", () => {
  const lines = allocateOrderDiscount([
    { position: 0, quantity: 2, unitPriceCents: 1250 },
    { position: 1, quantity: 1, unitPriceCents: 7500 },
  ], 1000);
  assert.deepEqual(lines.map((line) => line.discountCents), [250, 750]);
  assert.throws(() => allocateOrderDiscount([{ position: 0, quantity: 1, unitPriceCents: 10 }], 11));
  const large = allocateOrderDiscount([
    { position: 0, quantity: 99, unitPriceCents: 100_000_000 },
    { position: 1, quantity: 99, unitPriceCents: 100_000_000 },
  ], 9_900_000_001);
  assert.deepEqual(large.map((line) => line.discountCents), [4_950_000_001, 4_950_000_000]);
});

test("partial refunds reconcile to the exact line total", () => {
  const line = { quantity: 3, totalCents: 1000, refundedQuantity: 0, refundedCents: 0 };
  const first = refundForQuantity(line, 1);
  assert.deepEqual(first, { amountCents: 333, refundedQuantity: 1, refundedCents: 333, refundStatus: "PARTIAL" });
  const last = refundForQuantity({ ...line, ...first }, 2);
  assert.deepEqual(last, { amountCents: 667, refundedQuantity: 3, refundedCents: 1000, refundStatus: "FULL" });
});

test("duplicate callbacks are skipped only after every sibling/bundle line completes", () => {
  const paid = { paymentStatus: "SUCCEEDED", orderStatus: "PAID", provisioningStatus: "SUCCEEDED" };
  assert.equal(isOrderCallbackComplete({ ...paid, lineStatuses: ["SUCCEEDED", "SUCCEEDED"] }), true);
  assert.equal(isOrderCallbackComplete({ ...paid, lineStatuses: ["SUCCEEDED", "RETRY_PENDING"] }), false);
  assert.equal(isOrderCallbackComplete({ ...paid, lineStatuses: [] }), true); // historical order fallback
});
