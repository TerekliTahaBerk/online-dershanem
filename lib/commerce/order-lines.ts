export type PricedOrderLine = {
  position: number;
  quantity: number;
  unitPriceCents: number;
};

export type OrderLineMoney = PricedOrderLine & {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
};

function assertCents(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${label} must be non-negative integer cents`);
}

/**
 * Allocate an order discount using largest remainder apportionment. The result
 * is stable for the same positions, sums exactly to discountCents, and never
 * discounts a line below zero.
 */
export function allocateOrderDiscount(lines: PricedOrderLine[], discountCents: number): OrderLineMoney[] {
  assertCents(discountCents, "discountCents");
  if (!lines.length) throw new Error("At least one order line is required");

  const prepared = lines.map((line) => {
    if (!Number.isSafeInteger(line.position) || line.position < 0) throw new Error("Line position is invalid");
    if (!Number.isSafeInteger(line.quantity) || line.quantity < 1) throw new Error("Line quantity is invalid");
    assertCents(line.unitPriceCents, "unitPriceCents");
    const subtotalCents = line.quantity * line.unitPriceCents;
    if (!Number.isSafeInteger(subtotalCents)) throw new Error("Line subtotal exceeds safe integer range");
    return { ...line, subtotalCents };
  });
  const subtotalCents = prepared.reduce((sum, line) => sum + line.subtotalCents, 0);
  if (!Number.isSafeInteger(subtotalCents) || subtotalCents <= 0) throw new Error("Order subtotal must be positive");
  if (discountCents > subtotalCents) throw new Error("Discount cannot exceed order subtotal");

  const allocations = prepared.map((line) => {
    const numerator = BigInt(line.subtotalCents) * BigInt(discountCents);
    const denominator = BigInt(subtotalCents);
    return { ...line, discountCents: Number(numerator / denominator), remainder: numerator % denominator };
  });
  let unallocated = discountCents - allocations.reduce((sum, line) => sum + line.discountCents, 0);
  const priority = [...allocations].sort((a, b) => a.remainder === b.remainder
    ? a.position - b.position
    : a.remainder > b.remainder ? -1 : 1);
  for (let index = 0; index < priority.length && unallocated > 0; index += 1, unallocated -= 1) {
    priority[index].discountCents += 1;
  }

  return allocations
    .sort((a, b) => a.position - b.position)
    .map((line) => ({
      position: line.position,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      subtotalCents: line.subtotalCents,
      discountCents: line.discountCents,
      taxCents: 0,
      totalCents: line.subtotalCents - line.discountCents,
    }));
}

export function assertOrderLineReconciliation(lines: OrderLineMoney[], order: {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}) {
  const sums = lines.reduce((result, line) => ({
    subtotalCents: result.subtotalCents + line.subtotalCents,
    discountCents: result.discountCents + line.discountCents,
    totalCents: result.totalCents + line.totalCents,
  }), { subtotalCents: 0, discountCents: 0, totalCents: 0 });
  if (sums.subtotalCents !== order.subtotalCents || sums.discountCents !== order.discountCents || sums.totalCents !== order.totalCents) {
    throw new Error("ORDER_LINE_TOTAL_MISMATCH");
  }
}

export type RefundableLine = { quantity: number; totalCents: number; refundedQuantity: number; refundedCents: number };

export function isOrderCallbackComplete(input: {
  paymentStatus: string;
  orderStatus: string;
  provisioningStatus: string;
  lineStatuses: string[];
}) {
  return input.paymentStatus === "SUCCEEDED"
    && input.orderStatus === "PAID"
    && input.provisioningStatus === "SUCCEEDED"
    && input.lineStatuses.every((status) => status === "SUCCEEDED" || status === "REVOKED");
}

/** Full refunds use the exact captured line total. Partial quantity refunds use
 * cumulative apportionment, so the final unit always absorbs rounding and the
 * sum can never exceed the captured line total. */
export function refundForQuantity(line: RefundableLine, requestedQuantity: number) {
  if (!Number.isSafeInteger(requestedQuantity) || requestedQuantity < 1) throw new Error("Refund quantity is invalid");
  const nextQuantity = line.refundedQuantity + requestedQuantity;
  if (nextQuantity > line.quantity) throw new Error("Refund quantity exceeds purchased quantity");
  const cumulativeCents = nextQuantity === line.quantity
    ? line.totalCents
    : Math.floor((line.totalCents * nextQuantity) / line.quantity);
  const amountCents = cumulativeCents - line.refundedCents;
  if (amountCents < 0) throw new Error("Existing refund amount is inconsistent");
  return {
    amountCents,
    refundedQuantity: nextQuantity,
    refundedCents: cumulativeCents,
    refundStatus: nextQuantity === line.quantity ? "FULL" as const : "PARTIAL" as const,
  };
}
