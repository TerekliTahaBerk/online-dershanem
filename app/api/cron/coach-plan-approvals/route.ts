import { runJob } from "@/lib/jobs/runner";
import { runCoachPlanApprovalReminders } from "@/lib/coaching-reminders-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  return runJob("coach-plan-approvals", request, () => runCoachPlanApprovalReminders(), { metrics: (result) => ({ processedCount: result.processed }) });
}
