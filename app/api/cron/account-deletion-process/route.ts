/**
 * Round R-D+ — Account Deletion processing cron.
 *
 * Günlük: APPROVED + scheduledFor ≤ now olan talepleri işler.
 * Her talep için anonymizeUser() çalışır (sipariş/audit kayıtlarını korur).
 *
 * Schedule: 0 2 * * * (her gün 02:00 UTC, vercel.json kayıtlı)
 */
import { prisma } from "@/lib/prisma";
import { runJob } from "@/lib/jobs/runner";
import { processApprovedDeletionRequest } from "@/lib/account-deletion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  return runJob("account-deletion-process", req, async () => {
    const now = new Date();
    const due = await prisma.accountDeletionRequest.findMany({
      where: {
        status: "APPROVED",
        scheduledFor: { lte: now },
      },
      select: { id: true, userId: true },
      take: 50, // batch limit
    });

    const results: Array<{ id: string; userId: string; ok: boolean; reason?: string }> = [];
    for (const r of due) {
      try {
        const res = await processApprovedDeletionRequest(r.id);
        results.push({ id: r.id, userId: r.userId, ok: res.ok, reason: res.ok ? undefined : res.reason });
      } catch (err) {
        results.push({
          id: r.id,
          userId: r.userId,
          ok: false,
          reason: err instanceof Error ? err.message : "unknown",
        });
      }
    }

    return {
      now: now.toISOString(),
      dueCount: due.length,
      processed: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  });
}
