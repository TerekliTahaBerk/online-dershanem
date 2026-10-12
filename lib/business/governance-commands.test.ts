import assert from "node:assert/strict";
import test from "node:test";
import { opsCommandSchema, opsPermission, OPS_STEP_UP, OPS_FINANCE } from "./ops-commands";
const id = "cjld2cjxh0000qzrmn831i7rn";

test("P2.7d ayrı bilgi/otomasyon/ayar/rol izinleri ve step-up korunur", () => {
  for (const type of ["knowledge.create", "knowledge.version", "prompt.create"] as const) assert.equal(opsPermission(type), "knowledge:write");
  for (const type of ["automation.create", "automation.toggle", "automation.dry_run"] as const) assert.equal(opsPermission(type), "automation:write");
  assert.equal(opsPermission("retention.update"), "settings:write");
  for (const type of ["role.assign", "role.revoke"] as const) {
    assert.equal(opsPermission(type), "role:write");
    assert.ok(OPS_STEP_UP.has(type));
    assert.ok(!OPS_FINANCE.has(type));
  }
  assert.ok(!OPS_STEP_UP.has("knowledge.create"));
});

test("P2.7d otomasyonda serbest kod ve onaysız dış iletişim reddedilir", () => {
  const base = { type: "automation.create", name: "Test kuralı", triggerType: "lead_created", conditions: {}, isActive: false };
  for (const actions of [[{ type: "eval", code: "process.exit()" }], [{ type: "send_approved_template_email", templateKey: "arbitrary" }], [], Array.from({ length: 6 }, () => ({ type: "STOP_AI" }))]) {
    assert.equal(opsCommandSchema.safeParse({ ...base, actions }).success, false);
  }
  assert.ok(opsCommandSchema.safeParse({ ...base, actions: [{ type: "create_task", title: "Adayı ara" }] }).success);
});

test("P2.7d alan sınırları ve revizyon biçimi korunur", () => {
  for (const days of [29, 3651, 30.5]) assert.equal(opsCommandSchema.safeParse({ type: "retention.update", retentionDays: days }).success, false);
  assert.ok(opsCommandSchema.safeParse({ type: "retention.update", retentionDays: "730" }).success);
  assert.equal(opsCommandSchema.safeParse({ type: "role.assign", userId: id, businessUnitId: id, role: "OWNER" }).success, false);
  assert.equal(opsCommandSchema.safeParse({ type: "knowledge.version", id, content: "Yeterince uzun içerik", isActive: true, expectedRevision: "yesterday" }).success, false);
  assert.equal(opsCommandSchema.safeParse({ type: "automation.toggle", id, isActive: "false" }).success, false);
  assert.equal(opsCommandSchema.safeParse({ type: "prompt.create", name: "Test", systemPrompt: "kısa" }).success, false);
});
