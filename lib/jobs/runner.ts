import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { failCronRun, startCronRun, succeedCronRun, type CronRunMetrics } from "./heartbeat";
import type { CriticalCronName } from "./health";
import { reportOperationalAlert } from "@/lib/error-capture";

type RunJobOptions<T> = {
  metrics?: (result: T) => CronRunMetrics;
  secrets?: Array<string | undefined>;
};

function validBearer(request: Request, secrets: Array<string | undefined>) {
  const actual = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return secrets.some((secret) => {
    if (!secret || secret.length < 16) return false;
    const expectedBuffer = Buffer.from(secret);
    const actualBuffer = Buffer.from(actual);
    return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
  });
}

export async function runJob<T>(
  name: CriticalCronName,
  request: Request,
  job: () => Promise<T>,
  options: RunJobOptions<T> = {},
): Promise<NextResponse> {
  const secrets = options.secrets ?? [process.env.CRON_SECRET];
  if (!validBearer(request, secrets)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  let run: Awaited<ReturnType<typeof startCronRun>>;
  try {
    run = await startCronRun(name);
  } catch {
    await reportOperationalAlert({
      event: "cron.heartbeat.persistence_failed",
      severity: "critical",
      summary: `${name} heartbeat kaydı başlatılamadı`,
      context: { job: name },
    });
    return NextResponse.json({ ok: false, job: name, error: "HEARTBEAT_UNAVAILABLE" }, { status: 503 });
  }
  try {
    const result = await job();
    await succeedCronRun(name, run.runId, run.startedAt, options.metrics?.(result) ?? {});
    return NextResponse.json({ ok: true, job: name, result });
  } catch (error) {
    await failCronRun(name, run.runId, run.startedAt, error).catch(() => undefined);
    return NextResponse.json({ ok: false, job: name, error: "JOB_FAILED" }, { status: 500 });
  }
}
