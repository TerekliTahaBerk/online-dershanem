import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { refundForQuantity } from "@/lib/commerce/order-lines";

type OrderParent = { odOrderId: string | null; odkOrderId: string | null };

async function refundedOrderTotal(tx: Prisma.TransactionClient, parent: OrderParent) {
  return tx.commerceOrderLine.aggregate({
    where: parent.odOrderId ? { odOrderId: parent.odOrderId } : { odkOrderId: parent.odkOrderId! },
    _sum: { refundedCents: true, totalCents: true },
  });
}

/**
 * Records a provider-confirmed refund against one immutable line.
 * Partial refunds keep the legacy order/payment PAID/SUCCEEDED because those
 * enums have no partial state. Once all captured line totals are refunded, the
 * legacy order and every successful payment move to REFUNDED atomically.
 */
export async function recordOrderLineRefund(input: { lineId: string; quantity: number }) {
  return prisma.$transaction(async (tx) => {
    const line = await tx.commerceOrderLine.findUniqueOrThrow({ where: { id: input.lineId } });
    const parent = { odOrderId: line.odOrderId, odkOrderId: line.odkOrderId };
    const order = line.odOrderId
      ? await tx.odOrder.findUniqueOrThrow({ where: { id: line.odOrderId }, select: { status: true, totalCents: true } })
      : await tx.odkOrder.findUniqueOrThrow({ where: { id: line.odkOrderId! }, select: { status: true, totalCents: true } });
    if (order.status !== "PAID" && order.status !== "REFUNDED") throw new Error("ONLY_PAID_ORDERS_CAN_BE_REFUNDED");

    const refund = refundForQuantity(line, input.quantity);
    await tx.commerceOrderLine.update({
      where: { id: line.id },
      data: {
        refundedQuantity: refund.refundedQuantity,
        refundedCents: refund.refundedCents,
        refundStatus: refund.refundStatus,
        ...(refund.refundStatus === "FULL" ? { fulfillmentStatus: "REVOKED" as const } : {}),
      },
    });
    if (refund.refundStatus === "FULL" && line.product === "ODK") {
      await tx.odkEntitlement.updateMany({
        where: { OR: [{ orderLineId: line.id }, ...(line.odkOrderId ? [{ orderId: line.odkOrderId }] : [])] },
        data: { revokedAt: new Date() },
      });
    }
    if (refund.refundStatus === "FULL" && line.product === "OD" && line.fulfillmentOwnerUserId) {
      const otherActiveLines = await tx.commerceOrderLine.count({
        where: {
          id: { not: line.id }, product: "OD", fulfillmentOwnerUserId: line.fulfillmentOwnerUserId,
          refundStatus: { not: "FULL" }, fulfillmentStatus: "SUCCEEDED",
        },
      });
      if (!otherActiveLines) {
        await tx.productMembership.updateMany({
          where: { userId: line.fulfillmentOwnerUserId, product: "OD", source: "PURCHASE" },
          data: { revokedAt: new Date() },
        });
      }
    }

    const aggregate = await refundedOrderTotal(tx, parent);
    const refundedCents = aggregate._sum.refundedCents ?? 0;
    const lineTotalCents = aggregate._sum.totalCents ?? 0;
    if (lineTotalCents !== order.totalCents) throw new Error("ORDER_LINE_TOTAL_MISMATCH");
    const fullyRefunded = refundedCents === order.totalCents;
    if (fullyRefunded && line.odOrderId) {
      await tx.odOrder.update({ where: { id: line.odOrderId }, data: { status: "REFUNDED" } });
      await tx.odPayment.updateMany({ where: { orderId: line.odOrderId, status: "SUCCEEDED" }, data: { status: "REFUNDED" } });
    } else if (fullyRefunded && line.odkOrderId) {
      await tx.odkOrder.update({ where: { id: line.odkOrderId }, data: { status: "REFUNDED" } });
      await tx.odkPayment.updateMany({ where: { orderId: line.odkOrderId, status: "SUCCEEDED" }, data: { status: "REFUNDED" } });
    }
    return { lineId: line.id, amountCents: refund.amountCents, orderRefundedCents: refundedCents, fullyRefunded };
  }, { isolationLevel: "Serializable" });
}
