import { deploymentEnvironment, evaluateConfiguration, RESTORE_DRILL_MAX_AGE_DAYS } from "@/lib/env-contract";
import { evaluateCronHeartbeats, type CronHeartbeatSnapshot, type CriticalCronName } from "@/lib/jobs/health";
import type { CacheStatus } from "@/lib/cache-core";

const DAY_MS = 24 * 60 * 60 * 1000;

function paytrCheck(env: NodeJS.ProcessEnv, required: boolean) {
  const keys = ["PAYTR_MERCHANT_ID", "PAYTR_MERCHANT_KEY", "PAYTR_MERCHANT_SALT"];
  const configuredCount = keys.filter((key) => Boolean(env[key]?.trim())).length;
  return {
    status: configuredCount === keys.length ? "ok" as const : "degraded" as const,
    required,
    configured: configuredCount === keys.length,
    code: configuredCount === 0 ? "PAYTR_NOT_CONFIGURED" : configuredCount < keys.length ? "PAYTR_PARTIAL_CONFIGURATION" : null,
  };
}

function restoreCheck(env: NodeJS.ProcessEnv, now: Date, required: boolean) {
  const raw = env.ODK_LAST_RESTORE_DRILL_AT?.trim();
  const restoredAt = raw ? new Date(raw) : null;
  const valid = Boolean(restoredAt && Number.isFinite(restoredAt.getTime()) && restoredAt <= now);
  const ageMs = valid ? now.getTime() - restoredAt!.getTime() : null;
  const fresh = valid && ageMs! <= RESTORE_DRILL_MAX_AGE_DAYS * DAY_MS;
  return {
    status: fresh ? "ok" as const : "degraded" as const,
    required,
    lastSuccessfulAt: valid ? restoredAt!.toISOString() : null,
    maxAgeDays: RESTORE_DRILL_MAX_AGE_DAYS,
    ageMs,
    code: !raw ? "RESTORE_EVIDENCE_MISSING" : !valid ? "RESTORE_EVIDENCE_INVALID" : !fresh ? "RESTORE_EVIDENCE_STALE" : null,
  };
}

export function buildReadinessReport(input: {
  db: { ok: boolean; latencyMs: number | null };
  heartbeats: CronHeartbeatSnapshot[];
  now?: Date;
  env?: NodeJS.ProcessEnv;
  cache?: CacheStatus;
}) {
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  const environment = deploymentEnvironment(env);
  const production = environment === "production";
  const configuration = evaluateConfiguration({ env, environment, now });
  const cron = evaluateCronHeartbeats(input.heartbeats, now);
  const paytr = paytrCheck(env, production);
  const restore = restoreCheck(env, now, production);
  const alerts = {
    status: env.ERROR_ALERT_WEBHOOK_URL?.trim() ? "ok" as const : "degraded" as const,
    required: production,
    configured: Boolean(env.ERROR_ALERT_WEBHOOK_URL?.trim()),
    code: env.ERROR_ALERT_WEBHOOK_URL?.trim() ? null : "ALERT_CHANNEL_NOT_CONFIGURED",
  };
  const cache = input.cache ?? {
    backend: env.UPSTASH_REDIS_REST_URL?.trim() && env.UPSTASH_REDIS_REST_TOKEN?.trim() ? "upstash" as const : production ? "unavailable" as const : "memory" as const,
    state: env.UPSTASH_REDIS_REST_URL?.trim() && env.UPSTASH_REDIS_REST_TOKEN?.trim() ? "ready" as const : production ? "degraded" as const : "ready" as const,
    configured: Boolean(env.UPSTASH_REDIS_REST_URL?.trim() && env.UPSTASH_REDIS_REST_TOKEN?.trim()),
    memSize: 0,
    lastErrorAt: null,
    lastErrorOperation: production ? "configuration" : null,
  };
  const checks = {
    database: { status: input.db.ok ? "ok" as const : "down" as const, required: true, latencyMs: input.db.latencyMs, code: input.db.ok ? null : "DATABASE_UNAVAILABLE" },
    configuration: {
      status: configuration.blockers.length ? "down" as const : "ok" as const,
      required: true,
      fingerprint: configuration.fingerprint,
      blockerCount: configuration.blockers.length,
      warningCount: configuration.warnings.length,
      blockers: configuration.blockers.map(({ key, code }) => ({ key, code })),
      warnings: configuration.warnings.map(({ key, code }) => ({ key, code })),
    },
    paytr,
    restore,
    cron: { status: cron.ok ? "ok" as const : "degraded" as const, required: true, jobs: cron.jobs },
    alerts,
    cache: {
      status: cache.backend === "upstash" && cache.state === "ready" ? "ok" as const : production ? "down" as const : "degraded" as const,
      required: production,
      ...cache,
      code: cache.backend === "upstash" && cache.state === "ready"
        ? null
        : !cache.configured ? "CACHE_NOT_CONFIGURED" : cache.backend === "disabled" ? "CACHE_DISABLED" : "CACHE_UNAVAILABLE",
    },
  };
  const ready = Object.values(checks).every((check) => !check.required || check.status === "ok");
  return {
    status: ready ? "ready" as const : "not_ready" as const,
    ready,
    now: now.toISOString(),
    environment,
    checks,
    unhealthyCronNames: cron.jobs.filter((job) => job.status !== "healthy").map((job) => job.name as CriticalCronName),
  };
}
