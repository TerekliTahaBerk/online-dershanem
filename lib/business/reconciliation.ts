import "server-only";
import { prisma } from "@/lib/prisma";
import { PRODUCT_ORDER_TABLE } from "@/lib/commerce/product-mapping";

export function reconciliationStatus(expectedCents: number | null, actualCents: number | null, duplicateCount = 1, commissionMissing = false) {
  if (duplicateCount > 1 || commissionMissing) return "REVIEW_REQUIRED" as const;
  if (expectedCents === null || actualCents === null) return "UNMATCHED" as const;
  return expectedCents === actualCents ? "MATCHED" as const : "REVIEW_REQUIRED" as const;
}

export async function reconcileBusinessUnit(businessUnitId: string) {
  const unit = await prisma.businessUnit.findUnique({ where: { id: businessUnitId }, select: { product: true } });
  if (!unit) throw new Error("BUSINESS_UNIT_NOT_FOUND");
  const ledgers = await prisma.financialTransaction.findMany({ where: { businessUnitId, kind: "SALE", status: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } } });
  let scanned = 0; let issues = 0;
  for (const ledger of ledgers) {
    // OD ve OK siparişleri OdOrder'da, ODK kendi tablosunda yaşar.
    const order = PRODUCT_ORDER_TABLE[unit.product] === "od"
      ? ledger.odOrderId ? await prisma.odOrder.findUnique({ where: { id: ledger.odOrderId }, include: { payments: true } }) : null
      : ledger.odkOrderId ? await prisma.odkOrder.findUnique({ where: { id: ledger.odkOrderId }, include: { payments: true } }) : null;
    const actualCents = order?.totalCents ?? null;
    const paidPayments = order?.payments.filter((payment) => payment.status === "SUCCEEDED") ?? [];
    const providerRef = paidPayments.find((payment) => payment.providerRef)?.providerRef ?? ledger.externalSourceId ?? ledger.id;
    const duplicateCount = providerRef ? await prisma.financialTransaction.count({ where: { businessUnitId, externalSourceId: ledger.externalSourceId, kind: ledger.kind } }) : 1;
    const commissionMissing = paidPayments.some((payment) => payment.provider === "PAYTR") && ledger.commissionCents === 0;
    const status = reconciliationStatus(ledger.netCents, actualCents, duplicateCount, commissionMissing);
    await prisma.reconciliationRecord.upsert({ where: { provider_externalId: { provider: "PAYTR", externalId: `${unit.product}:${providerRef}` } }, update: { financialTransactionId: ledger.id, expectedCents: ledger.netCents, actualCents, status, details: { orderId: order?.id ?? null, duplicateCount, commissionMissing } }, create: { businessUnitId, provider: "PAYTR", externalId: `${unit.product}:${providerRef}`, financialTransactionId: ledger.id, expectedCents: ledger.netCents, actualCents, status, details: { orderId: order?.id ?? null, duplicateCount, commissionMissing } } });
    scanned++; if (status !== "MATCHED") issues++;
  }
  return { scanned, issues };
}

export async function reconcileAllBusinessUnits() {
  const units = await prisma.businessUnit.findMany({ where: { isActive: true }, select: { id: true } });
  const results = await Promise.all(units.map((unit) => reconcileBusinessUnit(unit.id)));
  return results.reduce((sum, item) => ({ scanned: sum.scanned + item.scanned, issues: sum.issues + item.issues }), { scanned: 0, issues: 0 });
}
