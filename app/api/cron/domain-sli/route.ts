import { runJob } from "@/lib/jobs/runner";
import { alertOnPlanGenerationSli, getPlanGenerationSliSnapshot } from "@/lib/plan-generation-sli-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: Request) {
  return runJob("domain-sli", request, async () => {
    const snapshot = await getPlanGenerationSliSnapshot();
    const alerted = await alertOnPlanGenerationSli(snapshot);
    return { ...snapshot, alerted };
  }, {
    metrics: (result) => ({ processedCount: result.eligibleRequests, failedCount: result.systemErrors }),
  });
}
