import assert from "node:assert/strict";
import test from "node:test";
import { resolveOdCheckoutResultStatus } from "./payment-result";

test("payment success requires a PAID order", () => {
  assert.equal(
    resolveOdCheckoutResultStatus({
      orderStatus: "PENDING",
      paymentStatus: "PENDING",
      providerStatus: "success",
    }),
    "pending",
  );
  assert.equal(
    resolveOdCheckoutResultStatus({
      orderStatus: "PAID",
      paymentStatus: "SUCCEEDED",
      providerStatus: "failed",
    }),
    "success",
  );
});

test("failed, cancelled and refunded payments do not render success", () => {
  assert.equal(
    resolveOdCheckoutResultStatus({ orderStatus: "PENDING", paymentStatus: "FAILED" }),
    "failed",
  );
  assert.equal(
    resolveOdCheckoutResultStatus({ orderStatus: "CANCELLED", paymentStatus: "PENDING" }),
    "failed",
  );
  assert.equal(
    resolveOdCheckoutResultStatus({ orderStatus: "REFUNDED", paymentStatus: "REFUNDED" }),
    "failed",
  );
});
