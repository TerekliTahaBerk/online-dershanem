import { ratePercent, average, round1 } from "@/lib/analytics/rates";

export type CommercialCounts = {
  leadCount: number;
  wonLeadCount: number;
  paidOrderCount: number;
  provisionedOrderCount: number;
  refundedOrderCount: number;
  refundedCents: number;
  collectionsCents: number;
  packageRenewalsUpcoming: number;
  /** created→won süreleri (ms). */
  salesCycleMs: number[];
  salesByProduct: Array<{
    product: "OD" | "ODK" | "OTHER";
    packageName: string;
    orderCount: number;
    totalCents: number;
  }>;
};

export type CommercialMetrics = {
  leadCount: number;
  leadToWonPercent: number | null;
  wonToPaidPercent: number | null;
  paidToProvisionedPercent: number | null;
  avgSalesCycleDays: number | null;
  collectionsCents: number;
  refundedOrderCount: number;
  refundedCents: number;
  packageRenewalsUpcoming: number;
  salesByProduct: CommercialCounts["salesByProduct"];
};

export function calculateCommercialMetrics(input: CommercialCounts): CommercialMetrics {
  const salesCycleDays = input.salesCycleMs
    .filter((ms) => ms >= 0)
    .map((ms) => ms / 86_400_000);
  const avgDays = average(salesCycleDays);

  return {
    leadCount: input.leadCount,
    leadToWonPercent: ratePercent(input.wonLeadCount, input.leadCount),
    wonToPaidPercent: ratePercent(input.paidOrderCount, input.wonLeadCount),
    paidToProvisionedPercent: ratePercent(input.provisionedOrderCount, input.paidOrderCount),
    avgSalesCycleDays: avgDays === null ? null : round1(avgDays),
    collectionsCents: input.collectionsCents,
    refundedOrderCount: input.refundedOrderCount,
    refundedCents: input.refundedCents,
    packageRenewalsUpcoming: input.packageRenewalsUpcoming,
    salesByProduct: [...input.salesByProduct].sort(
      (a, b) => b.totalCents - a.totalCents || b.orderCount - a.orderCount,
    ),
  };
}
