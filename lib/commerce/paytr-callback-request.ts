import type { OdProvisioningFailurePoint } from "@/lib/od/provisioning";
import type { OdkProvisioningFailurePoint } from "@/lib/odk/provisioning";
import type { PaytrCallbackPayload } from "@/lib/odk/paytr";

export function parsePaytrCallbackPayload(text: string): PaytrCallbackPayload {
  const params = new URLSearchParams(text);
  return {
    merchant_oid: params.get("merchant_oid") ?? "",
    status: (params.get("status") as "success" | "failed") ?? "failed",
    total_amount: params.get("total_amount") ?? "0",
    hash: params.get("hash") ?? "",
    failed_reason_code: params.get("failed_reason_code") ?? undefined,
    failed_reason_msg: params.get("failed_reason_msg") ?? undefined,
    payment_type: params.get("payment_type") ?? undefined,
    payment_amount: params.get("payment_amount") ?? undefined,
    currency: params.get("currency") ?? undefined,
    installment_count: params.get("installment_count") ?? undefined,
    test_mode: params.get("test_mode") ?? undefined,
  };
}

export function resolveOdkTestFailurePoint(value: string | null): OdkProvisioningFailurePoint | undefined {
  return process.env.ODK_PROVISIONING_TEST_MODE === "true" && process.env.VERCEL_ENV !== "production" &&
    value && ["AFTER_USER", "AFTER_PROFILE", "AFTER_MEMBERSHIP"].includes(value)
    ? value as OdkProvisioningFailurePoint
    : undefined;
}

export function resolveOdTestFailurePoint(value: string | null): OdProvisioningFailurePoint | undefined {
  return process.env.OD_PROVISIONING_TEST_MODE === "true" && process.env.VERCEL_ENV !== "production" &&
    value && ["AFTER_USER", "AFTER_PROFILE", "AFTER_MEMBERSHIP"].includes(value)
    ? value as OdProvisioningFailurePoint
    : undefined;
}
