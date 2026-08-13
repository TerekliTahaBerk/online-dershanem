import assert from "node:assert/strict";
import test from "node:test";
import { decideOdkCommerceAvailability, defaultOdkPackagePolicy, parseOdkProductContract } from "./product-contract";
import { odkPublicAccessDecision } from "./pilot-rollout";

const approvals = {
  ODK_ROLLOUT_MODE: "general",
  ODK_PILOT_ACCEPTANCE_APPROVED: "true",
  ODK_PILOT_SECURITY_REVIEW_APPROVED: "true",
  ODK_PILOT_OPERATIONS_APPROVED: "true",
};

const contract = parseOdkProductContract({
  schemaVersion: 1,
  catalogVersion: 1,
  capturedAt: "2026-08-13T09:00:00.000Z",
  package: { id: "pkg", slug: "lgs", title: "LGS", description: null, priceCents: 12900, originalPriceCents: null },
  policy: { ...defaultOdkPackagePolicy, sales: { state: "AVAILABLE" }, rights: { ...defaultOdkPackagePolicy.rights, liveService: false } },
  exams: [{ id: "exam", seriesId: null, title: "Deneme", slug: "deneme", family: "LGS", startsAt: "2026-09-01T15:00:00.000Z", endsAt: "2026-09-01T17:00:00.000Z", lateEntryMinutes: 0, attemptLimit: 1, resultsReleasedAt: null, answerKeyReleasedAt: null, resultsReleaseMode: "ADMIN_AFTER_END", answerKeyReleaseMode: "WITH_RESULTS", liveServiceRequired: false }],
});

test("ODK checkout rollout, katalog ve ödeme kapılarının tümünü ister", () => {
  assert.equal(contract.success, true);
  if (!contract.success) return;
  for (const env of [
    { ODK_ROLLOUT_MODE: "disabled" },
    { ODK_ROLLOUT_MODE: "pilot" },
    { ...approvals, ODK_PILOT_KILL_SWITCH: "true" },
  ]) {
    const rollout = odkPublicAccessDecision(env);
    assert.equal(decideOdkCommerceAvailability({ contract: contract.data, rolloutAllowed: rollout.allowed, packageActive: true, paymentReady: true }).allowed, false);
  }
  const rollout = odkPublicAccessDecision(approvals);
  assert.deepEqual(decideOdkCommerceAvailability({ contract: contract.data, rolloutAllowed: rollout.allowed, packageActive: true, paymentReady: true }), { allowed: true, reason: null });
  assert.equal(decideOdkCommerceAvailability({ contract: contract.data, rolloutAllowed: rollout.allowed, packageActive: true, paymentReady: false }).allowed, false);
});
