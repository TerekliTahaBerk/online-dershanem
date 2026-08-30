import assert from "node:assert/strict";
import test from "node:test";
import {
  CLAIM_STALLED_AFTER_MS,
  RELATIONSHIP_CONFIRMATION_GRACE_MS,
  classifyOdLifecycle,
  OD_LIFECYCLE_EXCEPTION_ACTIONS,
  OD_LIFECYCLE_EXCEPTION_LABELS,
  type OdLifecycleFacts,
} from "./lifecycle-exceptions";

const NOW = new Date("2026-08-30T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

const healthy: OdLifecycleFacts = {
  state: "ACCOUNT_READY",
  provisioningStatus: "SUCCEEDED",
  dueAt: new Date(NOW.getTime() + 3_600_000),
  claim: { status: "PENDING", createdAt: ago(86_400_000) },
  relationship: { status: "UNCONFIRMED", createdAt: ago(86_400_000) },
};

test("yeni ödeme akışı hiçbir satır üretmeden ilerler", () => {
  const result = classifyOdLifecycle(healthy, NOW);
  assert.equal(result.bucket, "AUTOMATED");
  assert.deepEqual(result.codes, []);
});

test("yerleştirme kararı istisna değildir", () => {
  for (const state of ["PLACEMENT_PENDING", "GROUP_ASSIGNED", "WAITLISTED"] as const) {
    const result = classifyOdLifecycle({ ...healthy, state, claim: { status: "CLAIMED", createdAt: ago(86_400_000) } }, NOW);
    assert.equal(result.bucket, "HUMAN_DECISION", `${state} yanlış kovaya düştü`);
  }
});

test("provisioning hatası ve kimlik incelemesi istisnadır", () => {
  assert.deepEqual(classifyOdLifecycle({ ...healthy, provisioningStatus: "RETRY_PENDING" }, NOW).codes, ["PROVISIONING_FAILED"]);
  assert.deepEqual(classifyOdLifecycle({ ...healthy, provisioningStatus: "MANUAL_REVIEW" }, NOW).codes, ["PROVISIONING_FAILED"]);
  assert.deepEqual(classifyOdLifecycle({ ...healthy, state: "MANUAL_REVIEW" }, NOW).codes, ["IDENTITY_REVIEW"]);
  assert.deepEqual(classifyOdLifecycle({ ...healthy, state: "BLOCKED" }, NOW).codes, ["BLOCKED"]);
  assert.deepEqual(classifyOdLifecycle({ ...healthy, state: "NO_SLOT_REFUND_PENDING" }, NOW).codes, ["REFUND_PENDING"]);
});

test("davet süresi dolduğunda istisna; hatırlatmalar sürerken değil", () => {
  assert.deepEqual(classifyOdLifecycle({ ...healthy, claim: { status: "EXPIRED", createdAt: ago(20 * 86_400_000) } }, NOW).codes, ["CLAIM_EXPIRED"]);

  // Hatırlatma basamakları hâlâ işini yaparken kuyruğa satır düşürülmez.
  const stillNudging = classifyOdLifecycle({ ...healthy, claim: { status: "PENDING", createdAt: ago(CLAIM_STALLED_AFTER_MS - 1) } }, NOW);
  assert.equal(stillNudging.bucket, "AUTOMATED");

  const stalled = classifyOdLifecycle({ ...healthy, claim: { status: "PENDING", createdAt: ago(CLAIM_STALLED_AFTER_MS) } }, NOW);
  assert.deepEqual(stalled.codes, ["CLAIM_STALLED"]);
});

test("veli onayı süre tanınana kadar istisna değildir; ret her zaman istisnadır", () => {
  const withinGrace = classifyOdLifecycle({ ...healthy, relationship: { status: "UNCONFIRMED", createdAt: ago(RELATIONSHIP_CONFIRMATION_GRACE_MS - 1) } }, NOW);
  assert.equal(withinGrace.bucket, "AUTOMATED");

  const overdue = classifyOdLifecycle({ ...healthy, relationship: { status: "UNCONFIRMED", createdAt: ago(RELATIONSHIP_CONFIRMATION_GRACE_MS) } }, NOW);
  assert.deepEqual(overdue.codes, ["RELATIONSHIP_UNCONFIRMED"]);

  const rejected = classifyOdLifecycle({ ...healthy, relationship: { status: "REJECTED", createdAt: ago(60_000) } }, NOW);
  assert.deepEqual(rejected.codes, ["RELATIONSHIP_REJECTED"]);

  // Onaylanmış bağ ne kadar eski olursa olsun istisna değildir.
  const confirmed = classifyOdLifecycle({ ...healthy, relationship: { status: "CONFIRMED", createdAt: ago(400 * 86_400_000) } }, NOW);
  assert.equal(confirmed.bucket, "AUTOMATED");
});

test("birden çok neden birlikte ve ciddiyet sırasında döner", () => {
  const result = classifyOdLifecycle({
    state: "MANUAL_REVIEW",
    provisioningStatus: "RETRY_PENDING",
    dueAt: ago(3_600_000),
    claim: { status: "EXPIRED", createdAt: ago(20 * 86_400_000) },
    relationship: { status: "REJECTED", createdAt: ago(86_400_000) },
  }, NOW);
  assert.equal(result.bucket, "EXCEPTION");
  assert.deepEqual(result.codes, ["PROVISIONING_FAILED", "IDENTITY_REVIEW", "CLAIM_EXPIRED", "RELATIONSHIP_REJECTED", "SLA_BREACHED"]);
});

test("aşılan SLA tek başına istisna üretir", () => {
  const result = classifyOdLifecycle({ ...healthy, dueAt: ago(1) }, NOW);
  assert.deepEqual(result.codes, ["SLA_BREACHED"]);
});

test("her istisna kodunun etiketi ve sıradaki aksiyonu vardır", () => {
  for (const code of Object.keys(OD_LIFECYCLE_EXCEPTION_LABELS) as (keyof typeof OD_LIFECYCLE_EXCEPTION_LABELS)[]) {
    assert.ok(OD_LIFECYCLE_EXCEPTION_LABELS[code].length > 0);
    assert.ok(OD_LIFECYCLE_EXCEPTION_ACTIONS[code].length > 0, `${code} için sıradaki aksiyon yazılmamış`);
  }
});
