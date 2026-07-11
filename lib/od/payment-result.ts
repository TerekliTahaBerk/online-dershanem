export type OdOrderResultStatus = "PENDING" | "PAID" | "CANCELLED" | "REFUNDED";
export type OdPaymentResultStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type OdCheckoutResultStatus = "success" | "failed" | "pending";

/**
 * Provider return URLs are navigation hints, not proof of payment. A successful
 * result is shown only after the PayTR callback has marked the order as PAID.
 */
export function resolveOdCheckoutResultStatus(input: {
  orderStatus: OdOrderResultStatus;
  paymentStatus?: OdPaymentResultStatus | null;
  providerStatus?: string | null;
}): OdCheckoutResultStatus {
  if (input.orderStatus === "PAID") return "success";

  if (
    input.orderStatus === "CANCELLED" ||
    input.orderStatus === "REFUNDED" ||
    input.paymentStatus === "FAILED" ||
    input.paymentStatus === "REFUNDED" ||
    input.providerStatus === "failed"
  ) {
    return "failed";
  }

  return "pending";
}
