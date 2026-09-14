import test from "node:test";
import assert from "node:assert/strict";
import { consentValue, orderLinesMatch } from "@/lib/od/checkout-request";
import { parsePaytrCallbackPayload } from "@/lib/commerce/paytr-callback-request";
import { boundedInteger, dinoLatencyBand, dinoRedactionBand } from "@/lib/panel/dino-request";
import { collectDeleteBlockers, formatDeleteBlockers } from "@/lib/panel/user-deletion";

test("PayTR form gövdesi varsayımları koruyarak domain payload'una dönüşür", () => {
  assert.deepEqual(parsePaytrCallbackPayload("merchant_oid=OD123&status=success&total_amount=150000&hash=h"), {
    merchant_oid: "OD123", status: "success", total_amount: "150000", hash: "h",
    failed_reason_code: undefined, failed_reason_msg: undefined, payment_type: undefined,
    payment_amount: undefined, currency: undefined, installment_count: undefined, test_mode: undefined,
  });
});

test("checkout onayları ve immutable line fingerprint'i deterministiktir", () => {
  assert.equal(consentValue("on"), true);
  assert.equal(consentValue("false"), false);
  const line = { sku: "OD-1", quantity: 1, unitPriceCents: 300000, discountCents: 0, totalCents: 300000, fulfillmentOwnerKey: "owner" };
  assert.equal(orderLinesMatch([line], [{ ...line }]), true);
  assert.equal(orderLinesMatch([line], [{ ...line, totalCents: 299999 }]), false);
});

test("Dino kota ve telemetri bantları sınır değerlerini korur", () => {
  assert.equal(boundedInteger("101", 15, 1, 100), 100);
  assert.equal(boundedInteger("bozuk", 15, 1, 100), 15);
  assert.equal(dinoRedactionBand(3), "3+");
  assert.equal(dinoLatencyBand(8000), "2-8S");
});

test("kullanıcı silme blocker'ları ilişkili sayaçları birleştirir", () => {
  const counts = Object.fromEntries([
    "taughtGroups", "taughtLessons", "createdAssignments", "createdMaterials", "generatedRecoveryPackages",
    "studentHelpResponses", "requestedMfaResets", "approvedMfaResets", "createdCurriculums", "linkedLessonOutcomes",
    "linkedAssignmentOutcomes", "createdMockExams", "createdPilotCohorts", "createdOdkPilotRuns", "createdOdkExamSeries",
    "createdOdkExams", "createdOdkExamVersions", "uploadedOdkExamFiles", "odkExamAttempts", "scoredOdkExamAttempts",
  ].map((key) => [key, 0])) as Parameters<typeof collectDeleteBlockers>[0];
  counts.requestedMfaResets = 2;
  counts.approvedMfaResets = 1;
  assert.deepEqual(collectDeleteBlockers(counts), [{ code: "mfa_resets", label: "MFA sıfırlama kayıtları", count: 3 }]);
  assert.equal(formatDeleteBlockers(["a", "b", "c", "d", "e"]), "a, b, c, d, …");
});
