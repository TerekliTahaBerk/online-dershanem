import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCronHeartbeats } from "./health";

const now = new Date("2026-08-11T12:00:00.000Z");
const row = (name: string, succeededMinutesAgo: number) => ({
  name,
  lastStartedAt: new Date(now.getTime() - succeededMinutesAgo * 60_000 - 1000),
  lastSucceededAt: new Date(now.getTime() - succeededMinutesAgo * 60_000),
  lastFailedAt: null,
  lastDurationMs: 1000,
  processedCount: 2,
  failedCount: 0,
  lastErrorCode: null,
});

test("ODK heartbeat sekiz dakikalık sıkı eşikte stale olur", () => {
  const report = evaluateCronHeartbeats([row("odk-exam-lifecycle", 9)], now);
  assert.equal(report.jobs.find((job) => job.name === "odk-exam-lifecycle")?.status, "stale");
});

test("son başarının ardından gelen hata sağlıklı heartbeat'i geçersiz kılar", () => {
  const heartbeat = { ...row("odk-exam-lifecycle", 1), lastFailedAt: new Date(now.getTime() - 30_000), lastErrorCode: "ERROR" };
  const report = evaluateCronHeartbeats([heartbeat], now);
  assert.equal(report.jobs[0].status, "failed");
  assert.equal(report.ok, false);
});

test("eksik kritik işler ayrı ayrı missing raporlanır", () => {
  const report = evaluateCronHeartbeats([], now);
  assert.equal(report.jobs.length, 8);
  assert.equal(report.jobs.every((job) => job.status === "missing"), true);
});
