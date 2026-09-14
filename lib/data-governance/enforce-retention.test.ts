import assert from "node:assert/strict";
import test from "node:test";
import type { PrismaClient } from "@prisma/client";

import { enforceRetention, resolveDryRun } from "./enforce-retention";
import { PENDING_LEGAL_APPROVAL, type RetentionCategory } from "./retention-policy";

function fakeDb() {
  const calls: string[] = [];
  const notification = {
    count: async () => { calls.push("notification.count"); return 42; },
    findMany: async () => { calls.push("notification.findMany"); return []; },
    deleteMany: async () => { calls.push("notification.deleteMany"); return { count: 0 }; },
  };
  const db = {
    notification,
    auditLog: { create: async () => { calls.push("auditLog.create"); return {}; } },
    retentionMark: {
      findMany: async () => { calls.push("retentionMark.findMany"); return []; },
      createMany: async () => { calls.push("retentionMark.createMany"); return { count: 0 }; },
    },
  };
  return { db: db as unknown as PrismaClient, calls };
}

const pending: RetentionCategory = {
  category: "notification",
  description: "Bildirim",
  enforcement: "RETENTION_ENGINE",
  targets: [{ model: "Notification", dateField: "createdAt" }],
  retentionDays: PENDING_LEGAL_APPROVAL,
  childData: true,
};

test("DRY_RUN yalnız açıkça false ise kapanır", () => {
  assert.equal(resolveDryRun(undefined), true);
  assert.equal(resolveDryRun(""), true);
  assert.equal(resolveDryRun("0"), true);
  assert.equal(resolveDryRun("no"), true);
  assert.equal(resolveDryRun(" FALSE "), false);
});

test("onay bekleyen kategori gerçek modda bile yalnız sayılır, silinmez", async () => {
  const { db, calls } = fakeDb();
  const report = await enforceRetention({ db, dryRun: false, policy: [pending], now: new Date("2026-09-14T00:00:00Z") });
  assert.deepEqual(report.categories, [{
    category: "notification",
    status: "PENDING_LEGAL_APPROVAL",
    recordCount: 42,
    message: "notification için 42 kayıt hukuki onay bekliyor, silinmedi",
  }]);
  assert.deepEqual(calls, ["notification.count"]);
});

test("onaysız sayısal süre ve motor dışı kategori veriye dokunmaz", async () => {
  const { db, calls } = fakeDb();
  const report = await enforceRetention({
    db,
    dryRun: false,
    policy: [
      { ...pending, retentionDays: 365 },
      { ...pending, category: "finance", enforcement: "LEGAL_HOLD", targets: [] },
    ],
  });
  assert.equal(report.categories[0].status, "INVALID_POLICY");
  assert.equal(report.categories[1].status, "OUTSIDE_ENGINE");
  assert.deepEqual(calls, []);
});

test("onaylı kategoride gerçek çalıştırma onay parametresi olmadan başlamaz", async () => {
  const { db, calls } = fakeDb();
  const approved = { ...pending, retentionDays: 365, approvedBy: "Test kurulu", approvedAt: "2026-09-01" };
  await assert.rejects(() => enforceRetention({ db, dryRun: false, policy: [approved] }), /onay/);
  assert.deepEqual(calls, []);
  await assert.rejects(() => enforceRetention({ db, dryRun: true, policy: [approved], graceDays: -1 }), /graceDays/);
});

test("dry-run onaylı kategoride yazmadan sayar", async () => {
  const { db, calls } = fakeDb();
  const approved = { ...pending, retentionDays: 365, approvedBy: "Test kurulu", approvedAt: "2026-09-01" };
  const report = await enforceRetention({ db, dryRun: true, policy: [approved], now: new Date("2026-09-14T00:00:00Z") });
  const category = report.categories[0];
  assert.equal(category.status, "ENFORCED");
  assert.ok(category.status === "ENFORCED" && category.cutoff === "2025-09-14T00:00:00.000Z");
  assert.ok(!calls.some((call) => /create|delete/i.test(call)), calls.join(","));
});
