import { runJob } from "@/lib/jobs/runner";
import { processCrossProductEventOutbox, getOutboxHealthMetrics } from "@/lib/student-success/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Cross-product event outbox işleyici — idempotent consumer'lar. */
export async function GET(request: Request) {
  return runJob(
    "cross-product-events",
    request,
    async () => {
      const result = await processCrossProductEventOutbox(100);
      const health = await getOutboxHealthMetrics();
      return { ...result, health };
    },
    {
      secrets: [process.env.JOB_PROCESSOR_SECRET, process.env.CRON_SECRET],
      // Tek generic sayaca doldurma: ölü mektup, bayat kilit ve kapma çakışması
      // birbirinden bağımsız arıza sinyalleri.
      metrics: (result) => ({
        processedCount: result.processed,
        failedCount: result.failed,
        details: {
          crossProductEventFailures: result.failed,
          deadLetterCount: result.health.deadLetterCount,
          pendingCount: result.health.pendingCount,
          processingCount: result.health.processingCount,
          staleLocksRecovered: result.staleLocksRecovered,
          claimConflicts: result.claimConflicts,
          duplicateRejections: result.duplicateRejections,
        },
      }),
    },
  );
}

export const POST = GET;
