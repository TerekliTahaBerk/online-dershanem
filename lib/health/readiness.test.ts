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
