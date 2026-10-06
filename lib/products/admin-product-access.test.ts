import assert from "node:assert/strict";
import test from "node:test";

import { isMembershipPresent, planAdminProductAccessChange, type AdminAccessMembershipRow } from "./admin-product-access";

const NOW = new Date("2026-10-06T09:00:00.000Z");

function row(overrides: Partial<AdminAccessMembershipRow> & Pick<AdminAccessMembershipRow, "product">): AdminAccessMembershipRow {
  return {
    id: `m-${overrides.product}`,
    source: "MANUAL",
    startsAt: new Date("2026-01-01T00:00:00.000Z"),
    expiresAt: null,
    revokedAt: null,
    sourceOdOrderId: null,
    ...overrides,
  };
}

test("P0-2: seçili kalan PURCHASE üyeliğine dokunulmaz", () => {
  const purchase = row({
    product: "OD",
    source: "PURCHASE",
    startsAt: new Date("2026-09-01T00:00:00.000Z"),
    expiresAt: new Date("2027-06-30T00:00:00.000Z"),
    sourceOdOrderId: "order-1",
  });
  const plan = planAdminProductAccessChange({ memberships: [purchase], requested: ["OD"], now: NOW });
  assert.deepEqual(plan.grant, []);
  assert.deepEqual(plan.revoke, []);
  assert.deepEqual(plan.preserved, [{ product: "OD", membershipId: "m-OD", source: "PURCHASE", sourceOdOrderId: "order-1" }]);
  assert.equal(plan.changed, false);
});

test("P0-2: eksik ürün MANUAL açılır, mevcut korunur", () => {
  const plan = planAdminProductAccessChange({
    memberships: [row({ product: "OD", source: "PURCHASE", sourceOdOrderId: "order-1" })],
    requested: ["OD", "OK"],
    now: NOW,
  });
  assert.deepEqual(plan.grant, ["OK"]);
  assert.deepEqual(plan.revoke, []);
  assert.deepEqual(plan.before, ["OD"]);
  assert.deepEqual(plan.after, ["OD", "OK"]);
  assert.equal(plan.changed, true);
});

test("P0-2: seçilmeyen ürün iptal edilir (silinmez); zaten iptal olan tekrar iptal edilmez", () => {
  const plan = planAdminProductAccessChange({
    memberships: [
      row({ product: "OD", source: "PURCHASE" }),
      row({ product: "OK", revokedAt: new Date("2026-05-01T00:00:00.000Z") }),
      row({ product: "ODK" }),
    ],
    requested: ["ODK"],
    now: NOW,
  });
  assert.deepEqual(plan.revoke, ["OD"]);
  assert.deepEqual(plan.grant, []);
});

test("P0-2: süresi dolmuş satın alma yeniden açılırsa önceki satır audit için saklanır", () => {
  const expired = row({
    product: "OD",
    source: "PURCHASE",
    expiresAt: new Date("2026-06-30T00:00:00.000Z"),
    sourceOdOrderId: "order-old",
  });
  assert.equal(isMembershipPresent(expired, NOW), false);
  const plan = planAdminProductAccessChange({ memberships: [expired], requested: ["OD"], now: NOW });
  assert.deepEqual(plan.grant, ["OD"]);
  assert.equal(plan.replacedRows.length, 1);
  assert.equal(plan.replacedRows[0]?.source, "PURCHASE");
  assert.equal(plan.replacedRows[0]?.sourceOdOrderId, "order-old");
  assert.equal(plan.replacedRows[0]?.expiresAt, "2026-06-30T00:00:00.000Z");
});

test("P0-2: başlangıcı gelecekteki satın alma mevcut sayılır ve korunur", () => {
  const scheduled = row({ product: "ODK", source: "PURCHASE", startsAt: new Date("2026-12-01T00:00:00.000Z") });
  const plan = planAdminProductAccessChange({ memberships: [scheduled], requested: ["ODK"], now: NOW });
  assert.deepEqual(plan.grant, []);
  assert.equal(plan.preserved.length, 1);
});
