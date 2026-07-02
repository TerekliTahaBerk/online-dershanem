import assert from "node:assert/strict";
import test from "node:test";
import { validatePaytrPaymentInvariant } from "./paytr-callback-validation";

test("accepts the step-1 amount even when total_amount may differ", () => {
  assert.deepEqual(
    validatePaytrPaymentInvariant({ expectedAmountCents: 300000, paymentAmount: "300000", currency: "TL" }),
    { ok: true, paymentAmountCents: 300000 },
  );
});

test("rejects missing, malformed, mismatched or non-TL payments", () => {
  assert.equal(validatePaytrPaymentInvariant({ expectedAmountCents: 1, currency: "TL" }).ok, false);
  assert.equal(validatePaytrPaymentInvariant({ expectedAmountCents: 1, paymentAmount: "1.2", currency: "TL" }).ok, false);
  assert.equal(validatePaytrPaymentInvariant({ expectedAmountCents: 2, paymentAmount: "1", currency: "TL" }).ok, false);
  assert.equal(validatePaytrPaymentInvariant({ expectedAmountCents: 1, paymentAmount: "1", currency: "USD" }).ok, false);
});
