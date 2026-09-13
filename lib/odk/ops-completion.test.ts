import assert from "node:assert/strict";
import test from "node:test";
import { buildExamResultsSummary } from "./results-ops";
import { buildAdminPreview } from "./admin-preview";
import { DEFAULT_EXAM_SECURITY_POLICY, parseExamSecurityPolicy, securityPolicySummary } from "./exam-security";
import { integrityEventRetentionCutoff, purgeableIntegrityEventTypes } from "./event-retention";
import { buildCoachSuggestions } from "./coach-suggestions";

test("sonuç özeti ortalama / medyan / integrity sayar", () => {
  const summary = buildExamResultsSummary({
    assignmentCount: 5,
    attempts: [
      {
        id: "1",
        studentName: "A",
        status: "SUBMITTED",
        integrityLevel: "NORMAL",
        startedAt: new Date("2026-01-01T10:00:00Z"),
        submittedAt: new Date("2026-01-01T11:00:00Z"),
        score: { correctCount: 80, wrongCount: 20, blankCount: 20, totalNet: 75, publicationStatus: "HIDDEN", sectionBreakdown: [{ code: "MAT", title: "Matematik", net: 30 }] },
      },
      {
        id: "2",
        studentName: "B",
        status: "SUBMITTED",
        integrityLevel: "REVIEW",
        startedAt: new Date("2026-01-01T10:00:00Z"),
        submittedAt: new Date("2026-01-01T12:00:00Z"),
        score: { correctCount: 60, wrongCount: 40, blankCount: 20, totalNet: 50, publicationStatus: "HIDDEN" },
      },
      {
        id: "3",
        studentName: "C",
        status: "IN_PROGRESS",
        integrityLevel: "NORMAL",
        startedAt: new Date("2026-01-01T10:00:00Z"),
        submittedAt: null,
        score: null,
      },
    ],
  });
  assert.equal(summary.participation, 3);
  assert.equal(summary.submitted, 2);
  assert.equal(summary.missing, 3);
  assert.equal(summary.averageNet, 62.5);
  assert.equal(summary.medianNet, 62.5);
  assert.equal(summary.integrityReviewCount, 1);
  assert.equal(summary.sectionAverages[0]?.code, "MAT");
});

test("admin preview gerçek attempt oluşturmaz", () => {
  const preview = buildAdminPreview({
    kind: "STUDENT_EXAM",
    examId: "exam-1",
    title: "TYT 01",
    family: "TYT",
    durationMinutes: 165,
    sections: [{ code: "MAT", title: "Matematik", questionCount: 40 }],
    security: DEFAULT_EXAM_SECURITY_POLICY,
  });
  assert.equal(preview.createsAttempt, false);
  assert.equal(preview.studentExam?.startBlockedReason.includes("Denemeye Gir"), true);
  assert.ok(preview.disclaimer.includes("gerçek"));
});

test("güvenlik policy parse ve summary", () => {
  const policy = parseExamSecurityPolicy({ security: { fullscreenMode: "REQUIRED", allowExtraTimeMinutes: 10 } });
  assert.equal(policy.fullscreenMode, "REQUIRED");
  assert.equal(policy.allowExtraTimeMinutes, 10);
  assert.ok(securityPolicySummary(policy).some((line) => line.includes("Tam ekran")));
});

test("integrity retention 180 gün ve purgeable tipler", () => {
  const now = new Date("2026-09-01T12:00:00Z");
  const cutoff = integrityEventRetentionCutoff(now, 180);
  assert.equal(cutoff.toISOString(), "2026-03-05T12:00:00.000Z");
  assert.ok(purgeableIntegrityEventTypes().includes("TAB_HIDDEN"));
  assert.equal(purgeableIntegrityEventTypes().includes("EXAM_STARTED"), false);
});

test("koçum önerileri zayıf kazanımlardan üretilir, publish etmez", () => {
  const suggestions = buildCoachSuggestions([
    { code: "TYT.MAT.01", title: "Problemler", unitName: "Matematik", questionCount: 3, correctCount: 1, accuracyRate: 33 },
    { code: "TYT.MAT.02", title: "Geometri", unitName: "Matematik", questionCount: 4, correctCount: 4, accuracyRate: 100 },
  ]);
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0].cta, "ADD_TO_WEEKLY_PLAN");
  assert.ok(suggestions[0].label.includes("Problemler"));
});
