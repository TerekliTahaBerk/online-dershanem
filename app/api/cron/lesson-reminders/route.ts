import { runJob } from "@/lib/jobs/runner";
import { runLessonReminders } from "@/lib/lesson-reminders-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  return runJob("lesson-reminders", request, () => runLessonReminders(), { metrics: (result) => ({ processedCount: result.processed }) });
}
