import type { FinancialSource, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhone } from "@/lib/business/normalization";
import { COMMERCE_ORDER_TABLE } from "@/lib/commerce/product-mapping";

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

export async function upsertOrderLedger(tx: Prisma.TransactionClient, input: { source: Extract<FinancialSource, "ONLINE_DERSHANEM" | "ONLINE_DENEME_KULUBU">; orderId: string; totalCents: number; discountCents: number; description: string; paidAt: Date; paymentMethod?: string | null; buyerInfo?: unknown }) {
  const product = input.source === "ONLINE_DERSHANEM" ? "OD" : "ODK";
  const unit = await tx.businessUnit.upsert({
    where: { code: product }, update: { name: input.source === "ONLINE_DERSHANEM" ? "OnlineDershanem" : "OnlineDenemeKulübü", isActive: true },
    create: { code: product, product, name: input.source === "ONLINE_DERSHANEM" ? "OnlineDershanem" : "OnlineDenemeKulübü" },
  });
  const idempotencyKey = `order:${product}:${input.orderId}:sale`;
  const buyer = input.buyerInfo && typeof input.buyerInfo === "object" ? input.buyerInfo as Record<string, unknown> : {};
  const normalizedPhone = normalizePhone(typeof buyer.phone === "string" ? buyer.phone : typeof buyer.phoneNumber === "string" ? buyer.phoneNumber : undefined);
  const normalizedEmail = normalizeEmail(typeof buyer.email === "string" ? buyer.email : undefined);
  const lead = normalizedPhone || normalizedEmail ? await tx.businessLead.findFirst({ where: { businessUnitId: unit.id, OR: [{ normalizedPhone: normalizedPhone || undefined }, { normalizedEmail: normalizedEmail || undefined }] }, orderBy: { updatedAt: "desc" } }) : null;
  await tx.financialTransaction.upsert({
    where: { idempotencyKey },
    update: { status: "PAID", paidAt: input.paidAt, grossCents: input.totalCents + input.discountCents, discountCents: input.discountCents, netCents: input.totalCents },
    create: {
      businessUnitId: unit.id, source: input.source, externalSourceId: input.orderId, idempotencyKey, kind: "SALE", status: "PAID",
      transactionAt: input.paidAt, accrualAt: input.paidAt, paidAt: input.paidAt, description: input.description, category: "PACKAGE_SALE",
      grossCents: input.totalCents + input.discountCents, discountCents: input.discountCents, netCents: input.totalCents,
      paymentMethod: input.paymentMethod ?? "PAYTR", leadId: lead?.id, ...(COMMERCE_ORDER_TABLE[product] === "od" ? { odOrderId: input.orderId } : { odkOrderId: input.orderId }),
    },
  });
  if (lead) {
    await tx.businessLead.update({ where: { id: lead.id }, data: { stage: "WON", wonAt: lead.wonAt ?? input.paidAt, source: "PURCHASE_COMPLETED", ...(COMMERCE_ORDER_TABLE[product] === "od" ? { relatedOdOrderId: input.orderId } : { relatedOdkOrderId: input.orderId }) } });
    await tx.leadActivity.create({ data: { leadId: lead.id, type: "PAYMENT_COMPLETED", fromValue: lead.stage, toValue: "WON", metadata: { orderId: input.orderId, source: input.source } } });
    await tx.backgroundJob.upsert({ where: { idempotencyKey: `payment-automation:${product}:${input.orderId}` }, update: {}, create: { businessUnitId: unit.id, type: "AUTOMATE_PAYMENT_COMPLETED", idempotencyKey: `payment-automation:${product}:${input.orderId}`, payload: { leadId: lead.id, orderId: input.orderId } } });
  }
}

export async function assertAccountingPeriodOpen(businessUnitId: string, at: Date, client: Prisma.TransactionClient | typeof prisma = prisma) {
  const locked = await client.accountingPeriod.findFirst({ where: { businessUnitId, status: "LOCKED", startsAt: { lte: at }, endsAt: { gte: at } }, select: { id: true } });
  if (locked) throw new Error("ACCOUNTING_PERIOD_LOCKED");
}

export async function reverseLedgerTransaction(transactionId: string, actorUserId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const original = await tx.financialTransaction.findUnique({ where: { id: transactionId } });
    if (!original || original.cancelledAt) throw new Error("TRANSACTION_NOT_FOUND");
    const at = new Date(); await assertAccountingPeriodOpen(original.businessUnitId, at, tx);
    const reversal = await tx.financialTransaction.upsert({ where: { idempotencyKey: `reversal:${original.id}` }, update: {}, create: { businessUnitId: original.businessUnitId, source: original.source, idempotencyKey: `reversal:${original.id}`, kind: "REVERSAL", status: "PAID", transactionAt: at, paidAt: at, description: `Ters kayıt: ${original.description}`, category: original.category, grossCents: -original.grossCents, discountCents: -original.discountCents, netCents: -original.netCents, vatRate: original.vatRate, vatCents: -original.vatCents, withholdingRate: original.withholdingRate, withholdingCents: -original.withholdingCents, otherTaxCents: -original.otherTaxCents, commissionCents: -original.commissionCents, reversalOfId: original.id, createdById: actorUserId } });
    await tx.financialTransaction.update({ where: { id: original.id }, data: { cancelledAt: at, status: "CANCELLED" } });
    return reversal;
  });
}
