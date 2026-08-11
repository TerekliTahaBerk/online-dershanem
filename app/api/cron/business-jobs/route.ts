import { runJob } from "@/lib/jobs/runner";
import { processBackgroundJobs, scheduleBusinessMaintenanceJobs } from "@/lib/business/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runJob("business-jobs", request, async () => {
    await scheduleBusinessMaintenanceJobs();
    return processBackgroundJobs(20);
  }, {
    secrets: [process.env.JOB_PROCESSOR_SECRET, process.env.CRON_SECRET],
    metrics: (result) => ({ processedCount: result.processed, failedCount: result.failed }),
  });
}

export const POST = GET;
