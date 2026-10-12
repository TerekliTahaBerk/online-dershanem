import assert from "node:assert/strict";
import test from "node:test";
import { OPS_FINANCE, OPS_STEP_UP, opsCommandSchema, opsPermission } from "./ops-commands";

test("pazarlama + finans komutları: izin ve step-up web Server Action'larıyla aynı", () => {
  assert.equal(opsPermission("campaign.create"), "campaign:write");
  assert.equal(opsPermission("attribution.manual"), "campaign:write");
  assert.equal(opsPermission("meta_ads.sync"), "integration:write");
  assert.equal(opsPermission("finance.create"), "finance:write");
  assert.equal(opsPermission("finance.reverse"), "finance:reverse");
  assert.equal(opsPermission("period.lock"), "finance:reverse");
  assert.equal(opsPermission("reconciliation.run"), "finance:write");
  assert.deepEqual([...OPS_STEP_UP].sort(), ["finance.create", "finance.reverse", "period.lock"]);
  assert.ok(OPS_FINANCE.has("reconciliation.resolve") && !OPS_FINANCE.has("campaign.create"));
});

test("pazarlama + finans komutları: form dizgileri sayıya çevrilir; sınırlar korunur", () => {
  const parsed = opsCommandSchema.parse({ type: "finance.create", kind: "EXPENSE", description: "Reklam", category: "Pazarlama", amountTl: "250.5" });
  assert.equal(parsed.type === "finance.create" && parsed.amountTl, 250.5);
  assert.equal(parsed.type === "finance.create" && parsed.vatRate, 0);
  assert.equal(opsCommandSchema.safeParse({ type: "finance.create", kind: "EXPENSE", description: "Reklam", category: "Pazarlama", amountTl: 0 }).success, false, "tutar pozitif");
  assert.equal(opsCommandSchema.safeParse({ type: "finance.create", kind: "SALE", description: "Reklam", category: "Pazarlama", amountTl: 1 }).success, false, "satış kaydı elle açılmaz");
  assert.equal(opsCommandSchema.safeParse({ type: "period.lock", startsAt: "2026-13-01", endsAt: "2026-13-02" }).success, false);
  assert.equal(opsCommandSchema.safeParse({ type: "reconciliation.resolve", id: "cjld2cjxh0000qzrmn831i7rn", status: "MATCHED" }).success, false);
});
