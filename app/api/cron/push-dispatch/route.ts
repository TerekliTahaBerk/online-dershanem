import { runJob } from "@/lib/jobs/runner";
import { runPushDispatch } from "@/lib/push/dispatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * M5 push dağıtıcısı — `CRON_SECRET` Bearer ile korunur (mevcut `runJob`).
 * `PUSH_DELIVERY_MODE` varsayılanı DISABLED: yalnız saklama temizliği ve
 * kalp atışı çalışır, Expo'ya istek gitmez.
 */
export async function GET(request: Request) {
  return runJob("push-dispatch", request, () => runPushDispatch(), {
    metrics: (result) => ({
      processedCount: result.claimed,
      failedCount: result.failedPermanent,
      details: {
        activeDevices: result.activeDevices,
        fannedOut: result.fannedOut,
        sent: result.sent,
        accepted: result.accepted,
        ticketErrors: result.ticketErrors,
        deferred: result.deferred,
        retried: result.retried,
        dryRun: result.dryRun,
        devicesRevoked: result.devicesRevoked,
        receiptsOk: result.receiptsOk,
        receiptErrors: result.receiptErrors,
        pendingBacklog: result.pendingBacklog,
        oldestPendingAgeMs: result.oldestPendingAgeMs,
        skippedPreference: (result.skipped.PUSH_DISABLED ?? 0) + (result.skipped.CATEGORY_DISABLED ?? 0) + (result.skipped.IN_APP_DISABLED ?? 0),
        skippedSession: result.skipped.SESSION_INVALID ?? 0,
        skippedSource: result.skipped.SOURCE_INVALID ?? 0,
        skippedStale: result.skipped.STALE ?? 0,
        durationMs: result.durationMs,
      },
    }),
  });
}

export const POST = GET;
