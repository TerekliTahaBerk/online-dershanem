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
      metrics: (result) => ({ processedCount: result.processed, failedCount: result.failed }),
    },
  );
}

export const POST = GET;
