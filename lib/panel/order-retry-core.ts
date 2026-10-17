import { operationDigest } from "./group-mutation-core";
export class OrderRetryConflict extends Error {
  constructor(public code = "ORDER_CONFLICT", message = "Sipariş değişti veya erişim açma işlemi sürüyor. Güncel hâline göz atıp tekrar deneyebilirsiniz.") { super(message); }
}
export function orderRetryRevision(order: { id: string; updatedAt: Date }) {
  return operationDigest({ id: order.id, updatedAt: order.updatedAt.toISOString() });
}
export type AdminRetryClaim = { actorUserId: string; receiptKey: string; digest: string; expectedRevision: string };
export function readOrderRetryReceipt(payload: unknown, digest: string): { outcome: string; userId: string | null } {
  const stored = payload as { digest?: string; outcome?: string; userId?: string | null } | null;
  if (stored?.digest !== digest) throw new OrderRetryConflict("IDEMPOTENCY_REUSE", "İşlem anahtarı farklı bir istek için kullanılamaz.");
  if (!stored.outcome) throw new OrderRetryConflict("RETRY_IN_PROGRESS", "Bu istek işleniyor. Siparişin güncel durumunu kontrol edin.");
  return { outcome: stored.outcome, userId: stored.userId ?? null };
}
