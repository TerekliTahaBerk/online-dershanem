import assert from "node:assert/strict";
import test from "node:test";
import { protectReservedLogKeys } from "./log-context";

test("log bağlamı satırın olay adını ve seviyesini ezemez", () => {
  assert.deepEqual(protectReservedLogKeys({ event: "cron.heartbeat.persistence_failed", level: "x", job: "odk" }), { context_event: "cron.heartbeat.persistence_failed", context_level: "x", job: "odk" });
});
