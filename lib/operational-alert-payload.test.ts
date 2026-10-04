import assert from "node:assert/strict";
import test from "node:test";
import { buildOperationalAlertRequest } from "./operational-alert-payload";

const now = new Date("2026-10-04T19:00:00Z");
const alert = { event: "cron.failed", severity: "critical" as const, summary: "Cron failed @everyone", context: { internal: "context" } };

test("Discord receives a bounded message, no mentions, and confirms delivery", () => {
  const request = buildOperationalAlertRequest("https://discord.com/api/webhooks/123/test-token", { ...alert, summary: alert.summary.repeat(200) }, now);
  assert.equal(new URL(request.url).searchParams.get("wait"), "true");
  assert.ok(typeof request.body.content === "string");
  assert.ok(request.body.content.length <= 2000);
  assert.deepEqual(request.body.allowed_mentions, { parse: [] });
  assert.equal("context" in request.body, false);
});

test("custom webhooks retain the existing operational payload", () => {
  const request = buildOperationalAlertRequest("https://alerts.test.invalid/hook", alert, now);
  assert.equal(request.url, "https://alerts.test.invalid/hook");
  assert.deepEqual(request.body, { ...alert, occurredAt: now.toISOString() });
});

test("Discord-like paths on other hosts are not treated as Discord", () => {
  const request = buildOperationalAlertRequest("https://alerts.test.invalid/api/webhooks/123/test-token", alert, now);
  assert.equal("content" in request.body, false);
});
