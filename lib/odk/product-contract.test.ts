import assert from "node:assert/strict";
import test from "node:test";
import {
  contractAccessWindow,
  contractAllowsReport,
  contractExam,
  decideOdkSale,
  defaultOdkPackagePolicy,
  parseOdkProductContract,
  odkSellableContractIssues,
} from "./product-contract";

const snapshot = {
  schemaVersion: 1,
  catalogVersion: 3,
  capturedAt: "2026-08-13T09:00:00.000Z",
  package: { id: "pkg-1", slug: "lgs", title: "LGS", description: null, priceCents: 12900, originalPriceCents: null },
  policy: { ...defaultOdkPackagePolicy, sales: { state: "AVAILABLE" as const }, access: { starts: "PURCHASED_AT" as const, durationDays: 30 } },
  exams: [{ id: "exam-1", seriesId: "series-1", title: "Deneme 1", slug: "deneme-1", family: "LGS", startsAt: "2026-09-01T15:00:00.000Z", endsAt: "2026-09-01T17:00:00.000Z", lateEntryMinutes: 15, attemptLimit: 2, resultsReleasedAt: "2026-09-02T09:00:00.000Z", answerKeyReleasedAt: "2026-09-02T10:00:00.000Z", liveServiceRequired: true }],
};

test("ürün sözleşmesi paket, hak ve sınav kurallarını birlikte doğrular", () => {
  const parsed = parseOdkProductContract(snapshot);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(contractExam(parsed.data, "exam-1")?.attemptLimit, 2);
  assert.equal(contractAllowsReport(parsed.data, "PARENT"), true);
});

test("satış penceresi ve stok durumu deterministik karar üretir", () => {
  assert.deepEqual(decideOdkSale(snapshot.policy, new Date("2026-08-13T10:00:00Z")), { allowed: true });
  assert.deepEqual(decideOdkSale({ ...snapshot.policy, sales: { state: "SOLD_OUT" } }, new Date()), { allowed: false, reason: "SOLD_OUT" });
  assert.deepEqual(decideOdkSale({ ...snapshot.policy, sales: { state: "AVAILABLE", startsAt: "2026-09-01T00:00:00Z" } }, new Date("2026-08-13T10:00:00Z")), { allowed: false, reason: "NOT_STARTED" });
});

test("erişim süresi satın alma anından sözleşmedeki süreyle hesaplanır", () => {
  const window = contractAccessWindow(snapshot.policy, new Date("2026-08-13T09:00:00Z"));
  assert.equal(window.startsAt.toISOString(), "2026-08-13T09:00:00.000Z");
  assert.equal(window.expiresAt?.toISOString(), "2026-09-12T09:00:00.000Z");
});

test("eksik istisna politikası satış sözleşmesi kabul edilmez", () => {
  const invalid = structuredClone(snapshot) as Record<string, unknown>;
  const policy = invalid.policy as Record<string, unknown>;
  delete policy.exceptions;
  assert.equal(parseOdkProductContract(invalid).success, false);
});

test("satılabilir paket takvim ve yayın zamanlarını eksiksiz ister", () => {
  const parsed = parseOdkProductContract(snapshot);
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.deepEqual(odkSellableContractIssues(parsed.data), []);
  const missingRelease = structuredClone(parsed.data);
  missingRelease.exams[0].answerKeyReleasedAt = null;
  assert.deepEqual(odkSellableContractIssues(missingRelease), ["ANSWER_KEY_RELEASE_MISSING:exam-1"]);
});
