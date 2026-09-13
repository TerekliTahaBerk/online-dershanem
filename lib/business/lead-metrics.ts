import type { LeadLostReasonCode, LeadSource, LeadStage, Prisma } from "@prisma/client";
import { OPEN_LEAD_STAGES } from "@/lib/business/leads";
import { istanbulDayStart } from "@/lib/istanbul-time";
import { prisma } from "@/lib/prisma";

export type LeadAnalyticsScope = {
  unitIds: string[];
  from: Date;
  to: Date;
};

export type LeadAnalytics = {
  leadCount: number;
  openLeadCount: number;
  wonLeadCount: number;
  lostLeadCount: number;
  followUpOverdueCount: number;
  sourceConversion: Array<{ source: LeadSource; total: number; won: number; rate: number }>;
  stageConversion: Array<{ stage: LeadStage; count: number }>;
  averageMsInStage: Array<{ stage: LeadStage; averageMs: number; samples: number }>;
  ownerPerformance: Array<{
    ownerId: string | null;
    total: number;
    won: number;
    lost: number;
    overdue: number;
  }>;
  lostReasons: Array<{ code: LeadLostReasonCode | "UNKNOWN"; count: number }>;
};

function rate(won: number, total: number): number {
  return total > 0 ? won / total : 0;
}

/**
 * Reusable CRM analytics — always aggregate/groupBy, never derived from a paged list.
 */
export async function loadLeadAnalytics(scope: LeadAnalyticsScope): Promise<LeadAnalytics> {
  const { unitIds, from, to } = scope;
  const unitScope: Prisma.BusinessLeadWhereInput = {
    businessUnitId: { in: unitIds },
    anonymizedAt: null,
  };
  const createdWindow: Prisma.BusinessLeadWhereInput = {
    ...unitScope,
    createdAt: { gte: from, lte: to },
  };
  const now = new Date();
  const dayStart = istanbulDayStart(now);

  const [
    leadCount,
    openLeadCount,
    wonLeadCount,
    lostLeadCount,
    followUpOverdueCount,
    bySource,
    wonBySource,
    byStage,
    byOwner,
    wonByOwner,
    lostByOwner,
    overdueByOwner,
    lostReasonRows,
    stageActivities,
  ] = await Promise.all([
    prisma.businessLead.count({ where: createdWindow }),
    prisma.businessLead.count({ where: { ...unitScope, stage: { in: [...OPEN_LEAD_STAGES] } } }),
    prisma.businessLead.count({ where: { ...createdWindow, stage: "WON" } }),
    prisma.businessLead.count({ where: { ...createdWindow, stage: "LOST" } }),
    prisma.businessLead.count({
      where: {
        ...unitScope,
        stage: { in: [...OPEN_LEAD_STAGES] },
        OR: [
          { nextFollowUpAt: { lt: dayStart } },
          { tasks: { some: { completedAt: null, dueAt: { lt: dayStart } } } },
        ],
      },
    }),
    prisma.businessLead.groupBy({ by: ["source"], where: createdWindow, _count: { _all: true } }),
    prisma.businessLead.groupBy({
      by: ["source"],
      where: { ...createdWindow, stage: "WON" },
      _count: { _all: true },
    }),
    prisma.businessLead.groupBy({ by: ["stage"], where: unitScope, _count: { _all: true } }),
    prisma.businessLead.groupBy({
      by: ["assignedUserId"],
      where: createdWindow,
      _count: { _all: true },
    }),
    prisma.businessLead.groupBy({
      by: ["assignedUserId"],
      where: { ...createdWindow, stage: "WON" },
      _count: { _all: true },
    }),
    prisma.businessLead.groupBy({
      by: ["assignedUserId"],
      where: { ...createdWindow, stage: "LOST" },
      _count: { _all: true },
    }),
    prisma.businessLead.groupBy({
      by: ["assignedUserId"],
      where: {
        ...unitScope,
        stage: { in: [...OPEN_LEAD_STAGES] },
        OR: [
          { nextFollowUpAt: { lt: dayStart } },
          { tasks: { some: { completedAt: null, dueAt: { lt: dayStart } } } },
        ],
      },
      _count: { _all: true },
    }),
    prisma.businessLead.groupBy({
      by: ["lostReasonCode"],
      where: { ...createdWindow, stage: "LOST" },
      _count: { _all: true },
    }),
    prisma.leadActivity.findMany({
      where: {
        type: "STAGE_CHANGED",
        createdAt: { gte: from, lte: to },
        lead: unitScope,
        fromValue: { not: null },
      },
      select: { fromValue: true, toValue: true, createdAt: true, leadId: true },
      orderBy: { createdAt: "asc" },
      take: 5_000,
    }),
  ]);

  const wonSourceMap = new Map(wonBySource.map((row) => [row.source, row._count._all]));
  const sourceConversion = bySource
    .map((row) => {
      const total = row._count._all;
      const won = wonSourceMap.get(row.source) ?? 0;
      return { source: row.source, total, won, rate: rate(won, total) };
    })
    .sort((a, b) => b.total - a.total);

  const stageConversion = byStage
    .map((row) => ({ stage: row.stage, count: row._count._all }))
    .sort((a, b) => b.count - a.count);

  const wonOwner = new Map(wonByOwner.map((row) => [row.assignedUserId, row._count._all]));
  const lostOwner = new Map(lostByOwner.map((row) => [row.assignedUserId, row._count._all]));
  const overdueOwner = new Map(overdueByOwner.map((row) => [row.assignedUserId, row._count._all]));
  const ownerPerformance = byOwner
    .map((row) => ({
      ownerId: row.assignedUserId,
      total: row._count._all,
      won: wonOwner.get(row.assignedUserId) ?? 0,
      lost: lostOwner.get(row.assignedUserId) ?? 0,
      overdue: overdueOwner.get(row.assignedUserId) ?? 0,
    }))
    .sort((a, b) => b.won - a.won || b.total - a.total);

  const lostReasons = lostReasonRows
    .map((row) => ({
      code: (row.lostReasonCode ?? "UNKNOWN") as LeadLostReasonCode | "UNKNOWN",
      count: row._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  // Average time in stage: leave event duration when previous event entered that stage.
  const byLead = new Map<
    string,
    Array<{ fromValue: string | null; toValue: string | null; createdAt: Date }>
  >();
  for (const activity of stageActivities) {
    const list = byLead.get(activity.leadId) ?? [];
    list.push(activity);
    byLead.set(activity.leadId, list);
  }
  const durationAcc = new Map<LeadStage, { totalMs: number; samples: number }>();
  for (const events of byLead.values()) {
    const enteredAtByStage = new Map<string, Date>();
    for (const current of events) {
      const stage = current.fromValue as LeadStage | null;
      if (stage) {
        const enteredAt = enteredAtByStage.get(stage);
        if (enteredAt) {
          const ms = current.createdAt.getTime() - enteredAt.getTime();
          if (ms >= 0) {
            const acc = durationAcc.get(stage) ?? { totalMs: 0, samples: 0 };
            acc.totalMs += ms;
            acc.samples += 1;
            durationAcc.set(stage, acc);
          }
          enteredAtByStage.delete(stage);
        }
      }
      if (current.toValue) enteredAtByStage.set(current.toValue, current.createdAt);
    }
  }
  const averageMsInStage = [...durationAcc.entries()]
    .map(([stage, acc]) => ({
      stage,
      averageMs: acc.samples ? Math.round(acc.totalMs / acc.samples) : 0,
      samples: acc.samples,
    }))
    .sort((a, b) => b.samples - a.samples);

  return {
    leadCount,
    openLeadCount,
    wonLeadCount,
    lostLeadCount,
    followUpOverdueCount,
    sourceConversion,
    stageConversion,
    averageMsInStage,
    ownerPerformance,
    lostReasons,
  };
}
