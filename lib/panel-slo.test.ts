import assert from "node:assert/strict";
import test from "node:test";
import { calculatePanelSloReport, type ProductEventRow } from "./panel-slo";

function row(name: string, properties: unknown): ProductEventRow {
  return { name, properties, occurredAt: new Date("2026-07-19T00:00:00Z") };
}

test("SLO raporu p90 ve başarı oranlarını hesaplar", () => {
  const rows = [
    ...[100_000, 110_000, 120_000, 130_000, 200_000].map((durationMs) => row("lesson_close_completed", { durationMs, groupSize: 4, changedStudentCount: 1, privateNoteCount: 1, filledSharedFieldCount: 4, draftSaveCount: 1, interactionCount: 5, templateApplied: false, previousGoalUsed: false })),
    ...Array.from({ length: 5 }, () => row("lesson_close_quality", { missingFieldCount: 0, exceptionCount: 1, assignmentRecipientCount: 2, outcomeLinked: true })),
    ...Array.from({ length: 5 }, () => row("lesson_notes_finished", { durationMs: 500, outcome: "success", completionAttempt: true, groupSize: 4, privateNoteCount: 1, filledSharedFieldCount: 4 })),
    ...Array.from({ length: 5 }, () => row("student_assignment_progress_finished", { durationMs: 300, outcome: "success", targetStatus: "DONE" })),
    ...Array.from({ length: 5 }, () => row("admin_setup_finished", { durationMs: 900, outcome: "success", studentCount: 4, parentLinkCount: 2, lessonCount: 4 })),
    ...[400, 500, 600, 700, 800].map((durationMs) => row("parent_dashboard_loaded", { durationMs, childCountBand: "1", hasActiveEnrollment: true })),
    ...[100_000, 110_000, 120_000, 130_000, 140_000].map((entryDurationMs) => row("mock_exam_entry_completed", { examType: "LGS", entryDurationMs, sectionCount: 6, reasonCount: 2, source: "MANUAL" })),
    ...Array.from({ length: 5 }, () => row("plan_generated", { ruleVersion: "adaptive-v1", taskCount: 6, capacityMinutes: 135, reasonCount: 3, rebalanced: false })),
    ...Array.from({ length: 5 }, () => row("plan_review_completed", { durationMs: 60_000, taskCount: 6, approved: true })),
    ...Array.from({ length: 5 }, () => row("plan_preference_updated", { availableDayCount: 3, minutesPerDay: 45, planningEnabled: true, overwhelmPulse: 3 })),
    ...Array.from({ length: 5 }, () => row("weekly_digest_published", { trendBand: "STEADY", recipientBand: "2-3" })),
    ...Array.from({ length: 5 }, () => row("weekly_digest_viewed", { actorRole: "PARENT", trendBand: "STEADY", ageBand: "0-2D" })),
    ...Array.from({ length: 5 }, () => row("weekly_digest_feedback", { actorRole: "PARENT", helpful: true, anxietyPulse: 2 })),
    ...Array.from({ length: 5 }, () => row("weekly_digest_preference_updated", { actorRole: "PARENT", enabled: true, emailEnabled: false })),
    ...Array.from({ length: 5 }, () => row("case_rule_triggered", { ruleVersion: "intervention-v1", reasonCode: "REPEATED_REVIEW_DIFFICULTY" })),
    ...Array.from({ length: 5 }, () => row("intervention_logged", { action: "RESOLVE", reasonCode: "REPEATED_REVIEW_DIFFICULTY", timeToActionMs: 3_600_000, withinSla: true, noteProvided: false })),
    ...Array.from({ length: 5 }, () => row("case_closed", { reasonCode: "REPEATED_REVIEW_DIFFICULTY", outcomeCode: "SUPPORT_PLANNED" })),
  ];
  const report = calculatePanelSloReport(rows);
  assert.equal(report.find((metric) => metric.key === "teacher_close_time")?.value, 200_000);
  assert.equal(report.find((metric) => metric.key === "teacher_close_time_p50")?.value, 120_000);
  assert.equal(report.find((metric) => metric.key === "teacher_close_revision_rate")?.value, 0);
  assert.equal(report.find((metric) => metric.key === "teacher_save_reliability")?.value, 100);
  assert.equal(report.find((metric) => metric.key === "mock_exam_entry_time")?.value, 120_000);
  assert.equal(report.find((metric) => metric.key === "mock_exam_reason_coverage")?.value, 100);
  assert.equal(report.find((metric) => metric.key === "plan_acceptance")?.value, 100);
  assert.equal(report.every((metric) => metric.status === "healthy"), true);
});

test("az örneklem yanlış güven üretmez", () => {
  const report = calculatePanelSloReport([
    row("student_assignment_progress_finished", { durationMs: 300, outcome: "system_error", targetStatus: "DONE" }),
  ]);
  assert.equal(report.find((metric) => metric.key === "student_progress_reliability")?.status, "insufficient_data");
});

test("bozuk veya eski event satırları hesaplamaya girmez", () => {
  const report = calculatePanelSloReport(Array.from({ length: 8 }, () => row("parent_dashboard_loaded", { durationMs: 999_999_999, childCountBand: "1", hasActiveEnrollment: true })));
  const metric = report.find((item) => item.key === "parent_dashboard_speed");
  assert.equal(metric?.sampleSize, 0);
  assert.equal(metric?.status, "insufficient_data");
});
