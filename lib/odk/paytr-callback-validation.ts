export type PaytrPaymentInvariantInput = {
  expectedAmountCents: number;
  paymentAmount?: string;
  currency?: string;
};

export type PaytrPaymentInvariantResult =
  | { ok: true; paymentAmountCents: number }
  | { ok: false; reason: "missing_payment_amount" | "invalid_payment_amount" | "amount_mismatch" | "currency_mismatch" };

/** Validate the order amount sent in PayTR step 1, not total_amount (which may include instalment fees). */
export function validatePaytrPaymentInvariant(
  input: PaytrPaymentInvariantInput,
): PaytrPaymentInvariantResult {
  if (!input.paymentAmount) return { ok: false, reason: "missing_payment_amount" };
  if (!/^\d+$/.test(input.paymentAmount)) {
    return { ok: false, reason: "invalid_payment_amount" };
  }

  const paymentAmountCents = Number(input.paymentAmount);
  if (!Number.isSafeInteger(paymentAmountCents) || paymentAmountCents <= 0) {
    return { ok: false, reason: "invalid_payment_amount" };
  }
  if (paymentAmountCents !== input.expectedAmountCents) {
    return { ok: false, reason: "amount_mismatch" };
  }
  if (input.currency !== "TL") {
    return { ok: false, reason: "currency_mismatch" };
  }

  return { ok: true, paymentAmountCents };
}
