import assert from "node:assert/strict";
import test from "node:test";
import { CRITICAL_CRON_DEFINITIONS } from "@/lib/jobs/health";
import { buildReadinessReport } from "./readiness";

const now = new Date("2026-08-11T12:00:00.000Z");
const env = {
  NODE_ENV: "test",
  VERCEL_ENV: "preview",
  DATABASE_URL: "postgres://configured",
  ODK_LAST_RESTORE_DRILL_AT: "2026-08-01T00:00:00.000Z",
} as NodeJS.ProcessEnv;
const heartbeats = CRITICAL_CRON_DEFINITIONS.map(({ name }) => ({
  name,
  lastStartedAt: new Date(now.getTime() - 60_000),
  lastSucceededAt: new Date(now.getTime() - 30_000),
  lastFailedAt: null,
  lastDurationMs: 500,
  processedCount: 1,
  failedCount: 0,
  lastErrorCode: null,
}));

const productionEnv = {
  ...env,
  NODE_ENV: "production",
  VERCEL_ENV: "production",
  DIRECT_URL: "postgres://direct",
  NEXT_PUBLIC_APP_URL: "https://production.test.invalid",
  NEXTAUTH_SECRET: "configured-auth-secret",
  PANEL_ENABLED: "true",
  CRON_SECRET: "configured-cron-secret",
  BLOB_READ_WRITE_TOKEN: "configured-blob-token",
  MFA_ENCRYPTION_KEY: Buffer.alloc(32, 7).toString("base64"),
  UPSTASH_REDIS_REST_URL: "https://redis.test.invalid",
  UPSTASH_REDIS_REST_TOKEN: "configured-redis-token",
  PAYTR_MERCHANT_ID: "configured-id",
  PAYTR_MERCHANT_KEY: "configured-key",
  PAYTR_MERCHANT_SALT: "configured-salt",
  RESEND_API_KEY: "configured-resend-key",
  EMAIL_MODE: "receipts",
  ODK_ROLLOUT_MODE: "disabled",
  ODK_PILOT_KILL_SWITCH: "false",
  ODK_PILOT_ACCEPTANCE_APPROVED: "false",
  ODK_PILOT_SECURITY_REVIEW_APPROVED: "false",
  ODK_PILOT_OPERATIONS_APPROVED: "false",
  ERROR_ALERT_WEBHOOK_URL: "https://alerts.test.invalid",
} as NodeJS.ProcessEnv;

test("readiness DB ve bütün kritik heartbeat'ler sağlıklıysa hazırdır", () => {
  const report = buildReadinessReport({ db: { ok: true, latencyMs: 4 }, heartbeats, now, env });
  assert.equal(report.ready, true);
  assert.equal(report.checks.database.status, "ok");
  assert.equal(report.checks.cron.jobs.length, 6);
});

test("stale cron readiness'i düşürürken secret değerleri çıktıya girmez", () => {
  const stale = heartbeats.map((item, index) => index ? item : { ...item, lastSucceededAt: new Date(now.getTime() - 20 * 60_000) });
  const report = buildReadinessReport({ db: { ok: true, latencyMs: 2 }, heartbeats: stale, now, env: { ...env, PAYTR_MERCHANT_KEY: "super-secret-value" } });
  assert.equal(report.ready, false);
  assert.equal(JSON.stringify(report).includes("super-secret-value"), false);
});

test("production readiness etkin Upstash backend'ini açıkça raporlar", () => {
  const report = buildReadinessReport({
    db: { ok: true, latencyMs: 3 },
    heartbeats,
    now,
    env: productionEnv,
    cache: {
      backend: "upstash",
      state: "ready",
      configured: true,
      memSize: 0,
      lastErrorAt: null,
      lastErrorOperation: null,
    },
  });

  assert.equal(report.ready, true);
  assert.equal(report.checks.cache.status, "ok");
  assert.equal(report.checks.cache.backend, "upstash");
  assert.deepEqual(report.checks.alerts.requiredEnv, ["ERROR_ALERT_WEBHOOK_URL"]);
});

test("production readiness Redis outage'ında kapanır ve degradation sebebini gösterir", () => {
  const report = buildReadinessReport({
    db: { ok: true, latencyMs: 3 },
    heartbeats,
    now,
    env: productionEnv,
    cache: {
      backend: "upstash",
      state: "degraded",
      configured: true,
      memSize: 0,
      lastErrorAt: "2026-08-11T11:59:00.000Z",
      lastErrorOperation: "ping",
    },
  });

  assert.equal(report.ready, false);
  assert.equal(report.checks.cache.status, "down");
  assert.equal(report.checks.cache.code, "CACHE_UNAVAILABLE");
  assert.equal(JSON.stringify(report).includes("configured-redis-token"), false);
});
