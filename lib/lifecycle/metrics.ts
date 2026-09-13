/**
 * Lead → Student funnel metrikleri — dashboard için yeniden kullanılabilir saf servis.
 * Veri yükleme `metrics-server.ts` içinde; bu dosya hesaplamayı izole eder.
 */

export type LifecycleFunnelCounts = {
  leadsTotal: number;
  qualified: number;
  won: number;
  paidOrders: number;
  provisionedOrders: number;
  failedProvisioningOrders: number;
  /** Ödeme → provisioning tamamlanma süreleri (ms). */
  provisionDurationsMs: number[];
};

export type LifecycleFunnelMetricKey =
  | "lead_to_qualified"
  | "qualified_to_won"
  | "won_to_paid"
  | "paid_to_provisioned"
  | "provision_duration_p50_ms"
  | "failed_provisioning_rate";

export type LifecycleFunnelMetric = {
  key: LifecycleFunnelMetricKey;
  label: string;
  sampleSize: number;
  value: number | null;
  unit: "percent" | "ms";
};

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((p / 100) * sorted.length) - 1] ?? null;
}

export function calculateLifecycleFunnelMetrics(input: LifecycleFunnelCounts): LifecycleFunnelMetric[] {
  const leadToQualified = rate(input.qualified, input.leadsTotal);
  const qualifiedToWon = rate(input.won, input.qualified);
  const wonToPaid = rate(input.paidOrders, input.won);
  const paidToProvisioned = rate(input.provisionedOrders, input.paidOrders);
  const failedRate = rate(input.failedProvisioningOrders, input.paidOrders);
  const provisionP50 = percentile(input.provisionDurationsMs, 50);

  return [
    {
      key: "lead_to_qualified",
      label: "Lead → Qualified",
      sampleSize: input.leadsTotal,
      value: leadToQualified,
      unit: "percent",
    },
    {
      key: "qualified_to_won",
      label: "Qualified → Won",
      sampleSize: input.qualified,
      value: qualifiedToWon,
      unit: "percent",
    },
    {
      key: "won_to_paid",
      label: "Won → Paid",
      sampleSize: input.won,
      value: wonToPaid,
      unit: "percent",
    },
    {
      key: "paid_to_provisioned",
      label: "Paid → Provisioned",
      sampleSize: input.paidOrders,
      value: paidToProvisioned,
      unit: "percent",
    },
    {
      key: "provision_duration_p50_ms",
      label: "Provisioning süresi (p50)",
      sampleSize: input.provisionDurationsMs.length,
      value: provisionP50,
      unit: "ms",
    },
    {
      key: "failed_provisioning_rate",
      label: "Başarısız provisioning oranı",
      sampleSize: input.paidOrders,
      value: failedRate,
      unit: "percent",
    },
  ];
}
