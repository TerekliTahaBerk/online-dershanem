import { runJob } from "@/lib/jobs/runner";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { generateAdaptiveSuggestionsForActiveStudents } from "@/lib/kocum/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Online Koçum adaptif öneri üretimi.
 * Sistem önerir; koç onayı olmadan öğrenci planına yazılmaz.
 */
export async function GET(request: Request) {
  return runJob(
    "kocum-suggestions",
    request,
    async () => {
      if (!getPanelFeatureFlags().adaptivePlan) {
        return { skipped: true, scanned: 0, created: 0 };
      }
      const result = await generateAdaptiveSuggestionsForActiveStudents();
      return { skipped: false, ...result };
    },
    {
      secrets: [process.env.JOB_PROCESSOR_SECRET, process.env.CRON_SECRET],
      metrics: (result) => ({ processedCount: result.created }),
    },
  );
}

export const POST = GET;
