import { MANAGEMENT_ANALYTICS_COHORT_MIN } from "@/lib/analytics/definitions";

export type SuppressionStatus = "READY" | "SUPPRESSED" | "EMPTY";

export type SuppressibleMetric<T> = {
  status: SuppressionStatus;
  sampleSize: number;
  minRequired: number;
  value: T | null;
  reason: string | null;
};

/**
 * Küçük kohortlarda başarı / kırılım metriklerini gizler.
 * Değer null döner; örneklem boyutu her zaman görünür kalır.
 */
export function suppressCohortMetric<T>(
  sampleSize: number,
  value: T | null | undefined,
  minRequired: number = MANAGEMENT_ANALYTICS_COHORT_MIN,
): SuppressibleMetric<T> {
  if (sampleSize <= 0) {
    return {
      status: "EMPTY",
      sampleSize: 0,
      minRequired,
      value: null,
      reason: "Örneklem yok.",
    };
  }
  if (sampleSize < minRequired) {
    return {
      status: "SUPPRESSED",
      sampleSize,
      minRequired,
      value: null,
      reason: `Gizlilik: en az ${minRequired} örnek gerekir (şu an ${sampleSize}).`,
    };
  }
  return {
    status: "READY",
    sampleSize,
    minRequired,
    value: value ?? null,
    reason: null,
  };
}

export function isMetricVisible(status: SuppressionStatus): boolean {
  return status === "READY";
}
