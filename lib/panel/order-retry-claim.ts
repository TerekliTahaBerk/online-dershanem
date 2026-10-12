import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { orderRetryRevision, OrderRetryConflict, type AdminRetryClaim } from "./order-retry-core";

/** Mevcut provisioner'ın sahiplenmesi ve kalıcı istek kaydı aynı transaction'dadır.
 * Dış etkiler provisioner'da kalır. Yarım kalan isteğin aynı anahtarla yeniden
 * yürütülmesi engellenir; RUNNING kurtarma süresi mevcut beş dakika kuralıdır. */
export async function claimAdminOrderRetry(product: "OD" | "ODK", id: string, input: AdminRetryClaim) {
  try { return await prisma.$transaction(async (tx) => {
    const select = { id: true, updatedAt: true, status: true, provisioningStatus: true, provisioningAttempts: true };
    const order = product === "OD" ? await tx.odOrder.findUnique({ where: { id }, select }) : await tx.odkOrder.findUnique({ where: { id }, select });
    if (!order || orderRetryRevision(order) !== input.expectedRevision || order.status !== "PAID" || order.provisioningStatus === "SUCCEEDED" || (order.provisioningStatus === "RUNNING" && order.updatedAt.getTime() >= Date.now() - 5 * 60_000)) throw new OrderRetryConflict();
    const where = { id, updatedAt: order.updatedAt, provisioningAttempts: order.provisioningAttempts, status: "PAID" as const };
    const data = { provisioningStatus: "RUNNING" as const, provisioningAttempts: { increment: 1 }, provisioningError: null };
    const claim = product === "OD" ? await tx.odOrder.updateMany({ where, data }) : await tx.odkOrder.updateMany({ where, data });
    if (claim.count !== 1) throw new OrderRetryConflict();
    await tx.auditLog.create({ data: { actorUserId: input.actorUserId, actorType: "USER", entityType: product === "OD" ? "OdOrder" : "OdkOrder", entityId: id, action: "order.provisioning.retry", summary: "Admin erişim açmayı yeniden başlattı", idempotencyKey: input.receiptKey, payload: { digest: input.digest, state: "STARTED" } } });
    return claim;
  }); } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new OrderRetryConflict("IDEMPOTENCY_RACE");
    throw error;
  }
}
