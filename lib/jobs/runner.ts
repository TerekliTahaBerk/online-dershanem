import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { failCronRun, startCronRun, succeedCronRun, type CronRunMetrics } from "./heartbeat";
import { reportOperationalAlert } from "@/lib/error-capture";
import { log } from "@/lib/logger";
import { safeErrorCode, type CriticalCronName } from "./health";

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
  } catch (error) {
    // Yeniden denemeler ve yedek istemci de başarısız: veritabanı gerçekten erişilemez.
    // Asıl neden loga yazılır (önceden yutuluyordu, alarm teşhis edilemiyordu).
    const errorCode = safeErrorCode(error);
    log.error("cron.heartbeat.persistence_failed", error, { job: name, errorCode });
    await reportOperationalAlert({
      event: "cron.heartbeat.persistence_failed",
      severity: "critical",
      summary: `${name} heartbeat kaydı başlatılamadı (${errorCode})`,
      context: { job: name, errorCode },
    });
    return NextResponse.json({ ok: false, job: name, error: "HEARTBEAT_UNAVAILABLE" }, { status: 503 });
  }
  let result: T;
  try {
    result = await job();
  } catch (error) {
    await failCronRun(name, run.runId, run.startedAt, error).catch((heartbeatError) => log.error("cron.heartbeat.fail_write_failed", heartbeatError, { job: name }));
    return NextResponse.json({ ok: false, job: name, error: "JOB_FAILED" }, { status: 500 });
  }
  // İş başarılı; başarı kaydı yazılamazsa iş "başarısız" sayılmaz (önceden JOB_FAILED dönüyordu).
  // Kayıt eksik kalırsa sağlık kontrolü bir sonraki başarılı çalışmaya kadar gecikme gösterir.
  try {
    await succeedCronRun(name, run.runId, run.startedAt, options.metrics?.(result) ?? {});
  } catch (error) {
    log.error("cron.heartbeat.success_write_failed", error, { job: name, errorCode: safeErrorCode(error) });
  }
  return NextResponse.json({ ok: true, job: name, result });
}
