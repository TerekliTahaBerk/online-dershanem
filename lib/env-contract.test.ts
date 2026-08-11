import assert from "node:assert/strict";
import test from "node:test";

import { evaluateConfiguration } from "./env-contract";

const productionEnv = {
  DATABASE_URL: "secret-database-url",
  DIRECT_URL: "secret-direct-url",
  NEXT_PUBLIC_APP_URL: "https://production.test.invalid",
  NEXTAUTH_SECRET: "secret-auth-value",
  PANEL_ENABLED: "true",
  CRON_SECRET: "secret-cron-value",
  BLOB_READ_WRITE_TOKEN: "secret-blob-value",
  ODK_ROLLOUT_MODE: "disabled",
  ODK_PILOT_KILL_SWITCH: "false",
  ODK_PILOT_ACCEPTANCE_APPROVED: "false",
  ODK_PILOT_SECURITY_REVIEW_APPROVED: "false",
  ODK_PILOT_OPERATIONS_APPROVED: "false",
  ODK_LAST_RESTORE_DRILL_AT: "2026-07-01T00:00:00.000Z",
  RESEND_API_KEY: "secret-resend-value",
  EMAIL_MODE: "receipts",
};

test("production'da kritik eksik deploy'u bloke eder ve değerleri sızdırmaz", () => {
  const env = { ...productionEnv, NEXTAUTH_SECRET: undefined };
  const report = evaluateConfiguration({ env, environment: "production", now: new Date("2026-08-11T00:00:00Z") });

  assert.equal(report.status, "blocked");
  assert.deepEqual(report.blockers, [{ key: "NEXTAUTH_SECRET", code: "missing", severity: "blocker" }]);
  assert.equal(JSON.stringify(report).includes("secret-"), false);
});

test("production'da örnek secret değeri geçerli konfigürasyon sayılmaz", () => {
  const report = evaluateConfiguration({
    env: { ...productionEnv, CRON_SECRET: "replace-with-random-bearer-token" },
    environment: "production",
    now: new Date("2026-08-11T00:00:00Z"),
  });
  assert.ok(report.blockers.some((issue) => issue.key === "CRON_SECRET" && issue.code === "invalid"));
});

test("preview'da production-only eksik warning olur, blocker olmaz", () => {
  const report = evaluateConfiguration({
    env: { DATABASE_URL: "secret-database-url" },
    environment: "preview",
    now: new Date("2026-08-11T00:00:00Z"),
  });

  assert.equal(report.status, "degraded");
  assert.equal(report.blockers.length, 0);
  assert.ok(report.warnings.some((issue) => issue.key === "NEXTAUTH_SECRET"));
});

test("restore drill eksik, geçersiz veya 90 günden eskiyse readiness degraded olur", () => {
  const now = new Date("2026-08-11T00:00:00Z");
  for (const [value, code] of [[undefined, "missing"], ["not-a-date", "invalid"], ["2026-01-01", "stale"]] as const) {
    const report = evaluateConfiguration({
      env: { ...productionEnv, ODK_LAST_RESTORE_DRILL_AT: value },
      environment: "production",
      now,
    });
    assert.equal(report.status, "degraded");
    assert.ok(report.warnings.some((issue) => issue.key === "ODK_LAST_RESTORE_DRILL_AT" && issue.code === code));
  }
});

test("aynı sorun seti aynı, değerlerden bağımsız fingerprint üretir", () => {
  const first = evaluateConfiguration({ env: { DATABASE_URL: "one" }, environment: "preview" });
  const second = evaluateConfiguration({ env: { DATABASE_URL: "two" }, environment: "preview" });
  assert.equal(first.fingerprint, second.fingerprint);
});

test("ODK rollout enum'u disabled değerini kabul eder, bilinmeyen değeri raporlar", () => {
  const disabled = evaluateConfiguration({ env: productionEnv, environment: "production", now: new Date("2026-08-11T00:00:00Z") });
  assert.equal(disabled.warnings.some((issue) => issue.key === "ODK_ROLLOUT_MODE"), false);

  const invalid = evaluateConfiguration({ env: { ...productionEnv, ODK_ROLLOUT_MODE: "GENERAL" }, environment: "production", now: new Date("2026-08-11T00:00:00Z") });
  assert.ok(invalid.warnings.some((issue) => issue.key === "ODK_ROLLOUT_MODE" && issue.code === "invalid"));
});

test("production general deploy'u üç approval olmadan bloke edilir", () => {
  const blocked = evaluateConfiguration({ env: { ...productionEnv, ODK_ROLLOUT_MODE: "general" }, environment: "production", now: new Date("2026-08-11T00:00:00Z") });
  assert.ok(blocked.blockers.some((issue) => issue.key === "ODK_GENERAL_APPROVALS"));

  const approved = evaluateConfiguration({
    env: {
      ...productionEnv,
      ODK_ROLLOUT_MODE: "general",
      ODK_PILOT_ACCEPTANCE_APPROVED: "true",
      ODK_PILOT_SECURITY_REVIEW_APPROVED: "true",
      ODK_PILOT_OPERATIONS_APPROVED: "true",
    },
    environment: "production",
    now: new Date("2026-08-11T00:00:00Z"),
  });
  assert.equal(approved.blockers.some((issue) => issue.key === "ODK_GENERAL_APPROVALS"), false);
});
