import "server-only";

import { logAudit } from "@/lib/audit";
import { operationDigest } from "./group-mutation-core";
import { orderRetryRevision, readOrderRetryReceipt, OrderRetryConflict } from "./order-retry-core";
export { OrderRetryConflict } from "./order-retry-core";
import { prisma } from "@/lib/prisma";
import { OdProvisioningError, provisionOdOrder } from "@/lib/od/provisioning";
import { OdkProvisioningError, provisionOdkOrder } from "@/lib/odk/provisioning";
import { provisioningErrorGuidance } from "@/lib/lifecycle/states";

/**
 * ERİŞİM AÇMAYI YENİDEN DENE servisi — web Server Action'ı ve mobil yönetim
 * ucu (`POST /api/panel/admin/orders/[id]/provisioning-retry`) aynı akışı
 * çağırır. İkinci bir provisioning yolu YOKTUR; `provisionOdOrder` /
 * `provisionOdkOrder` idempotenttir. Ödemeye DOKUNMAZ.
 */
export async function retryOrderProvisioningService(input: { actorUserId: string; orderId: string; idempotencyKey?: string; expectedRevision?: string }): Promise<{ found: false } | { found: true; outcome: string; userId: string | null }> {
  const orderId = input.orderId;
  const receiptKey = `order-retry:${input.actorUserId}:${input.idempotencyKey}`;
  const digest = operationDigest({ orderId, expectedRevision: input.expectedRevision ?? null });
  const replay = async () => {
    const receipt = await prisma.auditLog.findUnique({ where: { idempotencyKey: receiptKey }, select: { payload: true } });
    return receipt ? { found: true as const, ...readOrderRetryReceipt(receipt.payload, digest) } : null;
  };
  if (input.idempotencyKey) { const saved = await replay(); if (saved) return saved; }
  const [odOrder, odkOrder] = await Promise.all([
    prisma.odOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, userId: true, updatedAt: true } }),
    prisma.odkOrder.findUnique({ where: { id: orderId }, select: { id: true, status: true, studentUserId: true, updatedAt: true } }),
  ]);
  if (!odOrder && !odkOrder) return { found: false };

  const order = (odOrder ?? odkOrder)!;
  const adminRetry = input.idempotencyKey ? { actorUserId: input.actorUserId, receiptKey, digest, expectedRevision: input.expectedRevision ?? orderRetryRevision(order) } : undefined;
  let userId = odOrder?.userId ?? odkOrder?.studentUserId ?? null;
  let outcome: string;
  let entityType: "OdOrder" | "OdkOrder" = "OdOrder";
  try {
    if (odOrder) {
      const result = await provisionOdOrder(orderId, { adminRetry, studentUserId: odOrder.userId ?? undefined });
      userId = result.userId ?? userId;
      outcome = result.alreadyProvisioned
        ? "already_provisioned"
        : result.status === "SUCCEEDED"
          ? "succeeded"
          : `manual_review:${result.reason ?? "sebep belirtilmedi"}`;
    } else {
      entityType = "OdkOrder";
      const result = await provisionOdkOrder(orderId, { adminRetry, studentUserId: odkOrder?.studentUserId ?? undefined });
      userId = result.userId ?? userId;
      outcome = result.alreadyProvisioned
        ? "already_provisioned"
        : result.awaitingStudentAccount
          ? "manual_review:öğrenci hesabı yönetim tarafından açılmayı bekliyor"
          : "succeeded";
    }
  } catch (error) {
    if (error instanceof OrderRetryConflict) {
      if (error.code === "IDEMPOTENCY_RACE") { const saved = await replay(); if (saved) return saved; }
      throw error;
    }
    const code =
      error instanceof OdProvisioningError || error instanceof OdkProvisioningError
        ? error.code
        : error instanceof Error
          ? error.message
          : "bilinmeyen";
    outcome = `error:${code}:${provisioningErrorGuidance(code)}`;
  }

  if (adminRetry) {
    await prisma.auditLog.update({ where: { idempotencyKey: receiptKey }, data: { summary: `Admin erişim açmayı yeniden denedi · sonuç: ${outcome}`, payload: { digest, state: "COMPLETED", outcome, userId } } });
  } else await logAudit({
    actorUserId: input.actorUserId,
    entityType,
    entityId: orderId,
    action: "order.provisioning.retry",
    summary: `Admin erişim açmayı yeniden denedi · sonuç: ${outcome}`,
  });

  return { found: true, outcome, userId };
}

/**
 * Sonuç dizgisinin kullanıcı metni (mobil yanıt). Biçim yukarıdaki servisle
 * sabit: `succeeded` | `already_provisioned` | `manual_review:<neden>` |
 * `error:<kod>:<yönlendirme>`.
 */
export function describeProvisioningOutcome(outcome: string): { succeeded: boolean; message: string } {
  if (outcome === "succeeded") return { succeeded: true, message: "Erişim açıldı." };
  if (outcome === "already_provisioned") return { succeeded: true, message: "Erişim zaten açıktı." };
  if (outcome.startsWith("manual_review:")) return { succeeded: false, message: `Elle inceleme gerekiyor: ${outcome.slice("manual_review:".length)}` };
  const guidance = outcome.startsWith("error:") ? outcome.split(":").slice(2).join(":").trim() : "";
  return { succeeded: false, message: guidance ? `Erişim açılamadı: ${guidance}` : "Erişim açılamadı." };
}
