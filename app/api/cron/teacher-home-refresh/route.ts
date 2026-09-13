import { runJob } from "@/lib/jobs/runner";
import { refreshAllTeacherHomeSnapshots } from "@/lib/panel/teacher-home-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  return runJob(
    "teacher-home-refresh",
    request,
    async () => {
      const refreshed = await refreshAllTeacherHomeSnapshots();
      return { refreshed };
    },
    {
      secrets: [process.env.JOB_PROCESSOR_SECRET, process.env.CRON_SECRET],
      metrics: (result) => ({ processedCount: result.refreshed, failedCount: 0 }),
    },
  );
}

export const POST = GET;
