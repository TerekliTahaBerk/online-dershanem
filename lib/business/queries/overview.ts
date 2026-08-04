import "server-only";
import type { LeadStage, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Genel bakış KPI sorguları.
 *
 * KURAL: Hiçbir KPI, sayfalanmış bir listeden türetilmez. Önceki sürüm
 * "toplam konuşma"yı `take: 30`luk listeden, "toplam aday"ı `take: 100`den,
 * "reklam harcaması"nı `take: 50`den ve finans toplamlarını `take: 500`den
 * hesaplıyordu; 30'uncu kayıttan sonrası sessizce görünmez oluyordu.
 * Buradaki her metrik `count` / `aggregate` / `groupBy` ile veritabanında
 * hesaplanır ve liste sayfalamasından tamamen bağımsızdır.
 */

export type BusinessOverviewKpis = {
  conversationTotal: number;
  unreadConversations: number;
  waitingHumanConversations: number;
  leadsByStage: Record<string, number>;
  newLeads: number;
  wonLeads: number;
  lostLeads: number;
  leadTotal: number;
  adSpendCents: number;
  incomeCents: number;
  expenseCents: number;
  netCents: number;
  vatCents: number;
  withholdingCents: number;
  commissionCents: number;
};

export type OverviewScope = {
  unitIds: string[];
  from: Date;
  to: Date;
};

/**
 * Tek turda bütün genel bakış metriklerini hesaplar. Sorgular birbirinden
 * bağımsız olduğu için paralel çalışır.
 */
export async function loadBusinessOverviewKpis(scope: OverviewScope): Promise<BusinessOverviewKpis> {
  const { unitIds, from, to } = scope;
  const unitScope = { businessUnitId: { in: unitIds } };
  const conversationWindow: Prisma.BusinessConversationWhereInput = {
    ...unitScope,
    lastMessageAt: { gte: from, lte: to },
  };
  const leadWindow: Prisma.BusinessLeadWhereInput = {
    ...unitScope,
    createdAt: { gte: from, lte: to },
  };
  const financeWindow: Prisma.FinancialTransactionWhereInput = {
    ...unitScope,
    status: "PAID",
    transactionAt: { gte: from, lte: to },
  };

  const [
    conversationTotal,
    unreadConversations,
    waitingHumanConversations,
    leadStageRows,
    campaignSpend,
    financeTotals,
    financeByKind,
  ] = await Promise.all([
    prisma.businessConversation.count({ where: conversationWindow }),
    prisma.businessConversation.count({ where: { ...conversationWindow, unreadCount: { gt: 0 } } }),
    prisma.businessConversation.count({ where: { ...conversationWindow, status: "WAITING_HUMAN" } }),
    prisma.businessLead.groupBy({ by: ["stage"], where: leadWindow, _count: { _all: true } }),
    prisma.businessCampaign.aggregate({ where: unitScope, _sum: { spentCents: true } }),
    prisma.financialTransaction.aggregate({
      where: financeWindow,
      _sum: { netCents: true, vatCents: true, withholdingCents: true, commissionCents: true },
    }),
    prisma.financialTransaction.groupBy({
      by: ["kind"],
      where: financeWindow,
      _sum: { netCents: true },
    }),
  ]);

  const leadsByStage: Record<string, number> = {};
  for (const row of leadStageRows) leadsByStage[row.stage] = row._count._all;
  const stage = (name: LeadStage) => leadsByStage[name] ?? 0;

  const incomeCents = financeByKind
    .filter((row) => row.kind !== "EXPENSE")
    .reduce((sum, row) => sum + Math.max(0, row._sum.netCents ?? 0), 0);
  const expenseCents = financeByKind
    .filter((row) => row.kind === "EXPENSE")
    .reduce((sum, row) => sum + Math.abs(row._sum.netCents ?? 0), 0);

  return {
    conversationTotal,
    unreadConversations,
    waitingHumanConversations,
    leadsByStage,
    newLeads: stage("NEW"),
    wonLeads: stage("WON"),
    lostLeads: stage("LOST"),
    leadTotal: leadStageRows.reduce((sum, row) => sum + row._count._all, 0),
    adSpendCents: campaignSpend._sum.spentCents ?? 0,
    incomeCents,
    expenseCents,
    netCents: incomeCents - expenseCents,
    vatCents: financeTotals._sum.vatCents ?? 0,
    withholdingCents: financeTotals._sum.withholdingCents ?? 0,
    commissionCents: financeTotals._sum.commissionCents ?? 0,
  };
}

/** Gider tarafındaki indirilecek KDV — liste değil, aggregate ile. */
export async function loadDeductibleVatCents(scope: OverviewScope): Promise<number> {
  const result = await prisma.financialTransaction.aggregate({
    where: {
      businessUnitId: { in: scope.unitIds },
      status: "PAID",
      kind: "EXPENSE",
      transactionAt: { gte: scope.from, lte: scope.to },
    },
    _sum: { vatCents: true },
  });
  return result._sum.vatCents ?? 0;
}

/** Mesaj kutusu başlığındaki toplam — cursor sayfalamasından bağımsızdır. */
export async function countConversations(
  where: Prisma.BusinessConversationWhereInput,
): Promise<number> {
  return prisma.businessConversation.count({ where });
}

/** Satış hunisi sütun başlıkları — her aşamanın gerçek toplamı. */
export async function loadLeadStageCounts(unitIds: string[]): Promise<Record<string, number>> {
  const rows = await prisma.businessLead.groupBy({
    by: ["stage"],
    where: { businessUnitId: { in: unitIds } },
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.stage] = row._count._all;
  return counts;
}
