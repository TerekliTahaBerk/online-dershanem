import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REVOKED_SESSION_RETENTION_DAYS = 30;
const PRODUCT_EVENT_RETENTION_DAYS = 90;

/** Yalnız artık kimlik doğrulamada kullanılamayan oturumları temizler. */
export async function GET(request: Request) {
  return runJob("panel-session-retention", request, async () => {
    const now = new Date();
    const revokedBefore = new Date(now.getTime() - REVOKED_SESSION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const productEventsBefore = new Date(now.getTime() - PRODUCT_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await prisma.$transaction(async (tx) => {
      const deletedSessions = await tx.session.deleteMany({
        where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: revokedBefore } }] },
      });
      const deletedProductEvents = await tx.productEvent.deleteMany({ where: { occurredAt: { lt: productEventsBefore } } });
      if (deletedSessions.count > 0 || deletedProductEvents.count > 0) {
        await tx.auditLog.create({
          data: {
            actorType: "SYSTEM",
            entityType: "RetentionBatch",
            entityId: now.toISOString().slice(0, 10),
            action: "retention.panel_data_pruned",
            summary: "Süresi dolmuş panel operasyon verileri temizlendi",
            payload: { sessionCount: deletedSessions.count, productEventCount: deletedProductEvents.count, revokedSessionRetentionDays: REVOKED_SESSION_RETENTION_DAYS, productEventRetentionDays: PRODUCT_EVENT_RETENTION_DAYS },
          },
        });
      }
      return { deletedSessions, deletedProductEvents };
    });
    return { expiredBefore: now.toISOString(), revokedBefore: revokedBefore.toISOString(), productEventsBefore: productEventsBefore.toISOString(), deletedSessions: result.deletedSessions.count, deletedProductEvents: result.deletedProductEvents.count };
  }, { metrics: (result) => ({ processedCount: result.deletedSessions + result.deletedProductEvents }) });
}
