import type { FinancialSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export function calculateTax(grossCents: number, vatRate: number) {
  const vatCents = Math.round(grossCents * vatRate / (100 + vatRate));
  return { vatCents, netBeforeVatCents: grossCents - vatCents };
}

export function calculateAdMetrics(input: { spentCents: number; impressions: number; clicks: number; messageStarts: number; leads: number; sales: number; revenueCents: number; taxCents?: number; commissionCents?: number }) {
  const div = (value: number, count: number) => count > 0 ? value / count : 0;
  const netRevenue = input.revenueCents - (input.taxCents ?? 0) - (input.commissionCents ?? 0);
  return {
    cpmCents: div(input.spentCents * 1000, input.impressions),
    cpcCents: div(input.spentCents, input.clicks),
    ctr: input.impressions ? input.clicks / input.impressions : 0,
    costPerMessageCents: div(input.spentCents, input.messageStarts),
    costPerLeadCents: div(input.spentCents, input.leads),
    costPerSaleCents: div(input.spentCents, input.sales),
    conversionRate: input.leads ? input.sales / input.leads : 0,
    roas: input.spentCents ? input.revenueCents / input.spentCents : 0,
    netRoas: input.spentCents ? netRevenue / input.spentCents : 0,
    profitCents: netRevenue - input.spentCents,
  };
}

export async function upsertOrderLedger(tx: Prisma.TransactionClient, input: { source: Extract<FinancialSource, "ONLINE_DERSHANEM" | "ONLINE_DENEME_KULUBU">; orderId: string; totalCents: number; discountCents: number; description: string; paidAt: Date; paymentMethod?: string | null }) {
  const product = input.source === "ONLINE_DERSHANEM" ? "OD" : "ODK";
  const unit = await tx.businessUnit.upsert({
    where: { product }, update: { name: input.source === "ONLINE_DERSHANEM" ? "OnlineDershanem" : "OnlineDenemeKulübü", isActive: true },
    create: { code: product, product, name: input.source === "ONLINE_DERSHANEM" ? "OnlineDershanem" : "OnlineDenemeKulübü" },
  });
  const idempotencyKey = `order:${product}:${input.orderId}:sale`;
  await tx.financialTransaction.upsert({
    where: { idempotencyKey },
    update: { status: "PAID", paidAt: input.paidAt, grossCents: input.totalCents + input.discountCents, discountCents: input.discountCents, netCents: input.totalCents },
    create: {
      businessUnitId: unit.id, source: input.source, externalSourceId: input.orderId, idempotencyKey, kind: "SALE", status: "PAID",
      transactionAt: input.paidAt, accrualAt: input.paidAt, paidAt: input.paidAt, description: input.description, category: "PACKAGE_SALE",
      grossCents: input.totalCents + input.discountCents, discountCents: input.discountCents, netCents: input.totalCents,
      paymentMethod: input.paymentMethod ?? "PAYTR", ...(product === "OD" ? { odOrderId: input.orderId } : { odkOrderId: input.orderId }),
    },
  });
}

export async function assertAccountingPeriodOpen(businessUnitId: string, at: Date, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const locked = await client.accountingPeriod.findFirst({ where: { businessUnitId, status: "LOCKED", startsAt: { lte: at }, endsAt: { gte: at } }, select: { id: true } });
  if (locked) throw new Error("ACCOUNTING_PERIOD_LOCKED");
}
