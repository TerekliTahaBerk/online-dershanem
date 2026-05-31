/**
 * Phase 2 / Session 18 — Scheduled reminders cron entry-point.
 *
 * Auth: `Bearer ${CRON_SECRET}` header OR Vercel-Cron user agent (handled
 * by `runJob`). When `CRON_SECRET` is unset in dev, runJob fails open;
 * in production the env is set so it fails closed automatically.
 *
 * Schedule (configured in `vercel.json`): once per day at 08:30 server
 * time. Idempotency windows in the job module ensure repeated runs in
 * the same day produce zero duplicates.
 *
 * Response shape (no private data):
 *   {
 *     ok: true,
 *     job: "scheduled-reminders",
 *     durationMs: 1234,
 *     totals: { scanned, created, skipped, errors },
 *     jobs: [ { job, scanned, created, skipped, errors }, ... ]
 *   }
 */

import { runJob } from "@/lib/jobs/runner";
import { runAllScheduledReminders } from "@/lib/jobs/scheduled-reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return runJob("scheduled-reminders", req, async () => {
    const result = await runAllScheduledReminders();
    return {
      ok: result.totals.errors === 0,
      totals: result.totals,
      jobs: result.jobs,
    };
  });
}

// Allow POST so an admin "Run reminders" button or curl can trigger it
// the same way as the cron does.
export const POST = GET;
