import { createHmac } from "node:crypto";
import type { APIRequestContext } from "@playwright/test";

export function paytrCallbackBody(input: {
  merchantOid: string;
  status?: "success" | "failed";
  amountCents: number;
  paymentAmountCents?: number;
  currency?: string;
}) {
  const status = input.status ?? "success";
  const totalAmount = String(input.amountCents);
  const salt = process.env.PAYTR_MERCHANT_SALT ?? "e2e-only-merchant-salt";
  const key = process.env.PAYTR_MERCHANT_KEY ?? "e2e-only-merchant-key";
  const hash = createHmac("sha256", key)
    .update(input.merchantOid + salt + status + totalAmount)
    .digest("base64");
  return new URLSearchParams({
    merchant_oid: input.merchantOid,
    status,
    total_amount: totalAmount,
    payment_amount: String(input.paymentAmountCents ?? input.amountCents),
    currency: input.currency ?? "TL",
    payment_type: "card",
    hash,
    ...(status === "failed" ? { failed_reason_code: "e2e_declined", failed_reason_msg: "E2E declined" } : {}),
  }).toString();
}

export function postPaytrCallback(
  request: APIRequestContext,
  input: Parameters<typeof paytrCallbackBody>[0],
  failurePoint?: "AFTER_USER" | "AFTER_PROFILE" | "AFTER_MEMBERSHIP",
  failureService: "OD" | "ODK" = "ODK",
) {
  return request.post("/api/paytr/callback", {
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(failurePoint ? { [failureService === "OD" ? "x-od-test-failure" : "x-odk-test-failure"]: failurePoint } : {}),
    },
    data: paytrCallbackBody(input),
  });
}
