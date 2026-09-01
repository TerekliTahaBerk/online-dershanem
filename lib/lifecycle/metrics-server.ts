import "server-only";

import type { LeadStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateLifecycleFunnelMetrics,
  type LifecycleFunnelCounts,
  type LifecycleFunnelMetric,
} from "@/lib/lifecycle/metrics";

const QUALIFIED_STAGES: LeadStage[] = [
  "QUALIFIED",
  "MEETING_PLANNED",
  "TRIAL_PLANNED",
  "OFFER_SENT",
  "PAYMENT_PENDING",
  "WON",
];

type LoadOptions = {
  from: Date;
  to: Date;
  businessUnitIds?: string[];
};

/**
 * Funnel metriklerini DB'den toplar. Dashboard katmanı bu servisi çağırır;
 * UI burada tanımlı değildir.
 */
export async function loadLifecycleFunnelMetrics(options: LoadOptions): Promise<{
  counts: LifecycleFunnelCounts;
  metrics: LifecycleFunnelMetric[];
}> {
  const leadWhere: Prisma.BusinessLeadWhereInput = {
    createdAt: { gte: options.from, lte: options.to },
    anonymizedAt: null,
    ...(options.businessUnitIds?.length ? { businessUnitId: { in: options.businessUnitIds } } : {}),
  };

  const [leadsTotal, qualified, won, odPaid, odkPaid, odProvisioned, odkProvisioned, odFailed, odkFailed, odDurations, odkDurations] =
    await Promise.all([
      prisma.businessLead.count({ where: leadWhere }),
      prisma.businessLead.count({ where: { ...leadWhere, stage: { in: QUALIFIED_STAGES } } }),
      prisma.businessLead.count({ where: { ...leadWhere, stage: "WON" } }),
      prisma.odOrder.count({ where: { status: "PAID", createdAt: { gte: options.from, lte: options.to } } }),
      prisma.odkOrder.count({ where: { status: "PAID", createdAt: { gte: options.from, lte: options.to } } }),
      prisma.odOrder.count({
        where: { status: "PAID", provisioningStatus: "SUCCEEDED", createdAt: { gte: options.from, lte: options.to } },
      }),
      prisma.odkOrder.count({
        where: { status: "PAID", provisioningStatus: "SUCCEEDED", createdAt: { gte: options.from, lte: options.to } },
      }),
      prisma.odOrder.count({
        where: {
          status: "PAID",
          provisioningStatus: { in: ["RETRY_PENDING", "MANUAL_REVIEW"] },
          createdAt: { gte: options.from, lte: options.to },
        },
      }),
      prisma.odkOrder.count({
        where: {
          status: "PAID",
          provisioningStatus: "RETRY_PENDING",
          createdAt: { gte: options.from, lte: options.to },
        },
      }),
      prisma.odOrder.findMany({
        where: {
          status: "PAID",
          provisioningStatus: "SUCCEEDED",
          provisionedAt: { not: null },
          createdAt: { gte: options.from, lte: options.to },
        },
        select: {
          provisionedAt: true,
          payments: { where: { status: "SUCCEEDED" }, orderBy: { paidAt: "asc" }, take: 1, select: { paidAt: true } },
        },
        take: 500,
      }),
      prisma.odkOrder.findMany({
        where: {
          status: "PAID",
          provisioningStatus: "SUCCEEDED",
          provisionedAt: { not: null },
          createdAt: { gte: options.from, lte: options.to },
        },
        select: {
          provisionedAt: true,
          payments: { where: { status: "SUCCEEDED" }, orderBy: { paidAt: "asc" }, take: 1, select: { paidAt: true } },
        },
        take: 500,
      }),
    ]);

  const provisionDurationsMs: number[] = [];
  for (const row of [...odDurations, ...odkDurations]) {
    const paidAt = row.payments[0]?.paidAt;
    if (!paidAt || !row.provisionedAt) continue;
    const ms = row.provisionedAt.getTime() - paidAt.getTime();
    if (ms >= 0) provisionDurationsMs.push(ms);
  }

  const counts: LifecycleFunnelCounts = {
    leadsTotal,
    qualified,
    won,
    paidOrders: odPaid + odkPaid,
    provisionedOrders: odProvisioned + odkProvisioned,
    failedProvisioningOrders: odFailed + odkFailed,
    provisionDurationsMs,
  };

  return { counts, metrics: calculateLifecycleFunnelMetrics(counts) };
}
