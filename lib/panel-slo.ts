import { panelEventSchema, type PanelEventInput } from "@/lib/panel-events";

export type ProductEventRow = {
  name: string;
  properties: unknown;
  occurredAt: Date;
};

export type PanelSloMetric = {
  key: "teacher_close_time_p50" | "teacher_close_time" | "teacher_close_revision_rate" | "teacher_close_missing_rate" | "teacher_save_reliability" | "student_progress_reliability" | "admin_setup_reliability" | "parent_dashboard_speed" | "mock_exam_entry_time" | "mock_exam_reason_coverage" | "plan_acceptance" | "plan_review_time" | "plan_overwhelm_rate" | "digest_view_rate" | "digest_anxiety_rate" | "digest_optout_rate" | "intervention_first_action_time" | "intervention_false_positive_rate" | "intervention_closure_rate" | "recovery_publish_time" | "recovery_72h_completion" | "assignment_feedback_time" | "assignment_revision_approval";
  label: string;
  sampleSize: number;
  value: number | null;
  unit: "ms" | "percent";
  target: number;
  comparison: "lte" | "gte";
  status: "healthy" | "breached" | "insufficient_data";
};

const MIN_SAMPLE_SIZE = 5;

function percentile(values: number[], percentileValue: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil((percentileValue / 100) * sorted.length) - 1];
}

function status(sampleSize: number, value: number | null, target: number, comparison: "lte" | "gte"): PanelSloMetric["status"] {
  if (sampleSize < MIN_SAMPLE_SIZE || value === null) return "insufficient_data";
  return comparison === "lte" ? (value <= target ? "healthy" : "breached") : (value >= target ? "healthy" : "breached");
}

function validEvents(rows: ProductEventRow[]): PanelEventInput[] {
  return rows.flatMap((row) => {
    const parsed = panelEventSchema.safeParse({ name: row.name, properties: row.properties });
    return parsed.success ? [parsed.data] : [];
  });
}

function reliability(events: PanelEventInput[], name: PanelEventInput["name"]): { sampleSize: number; value: number | null } {
  const matching = events.filter((event) => event.name === name && "outcome" in event.properties);
  if (!matching.length) return { sampleSize: 0, value: null };
  const successes = matching.filter((event) => "outcome" in event.properties && event.properties.outcome === "success").length;
  return { sampleSize: matching.length, value: Math.round((successes / matching.length) * 10_000) / 100 };
}

export function calculatePanelSloReport(rows: ProductEventRow[]): PanelSloMetric[] {
  const events = validEvents(rows);
  const closeDurations = events.filter((event) => event.name === "lesson_close_completed").map((event) => event.properties.durationMs);
  const closeP90 = percentile(closeDurations, 90);
  const closeP50 = percentile(closeDurations, 50);
  const closeQuality = events.filter((event) => event.name === "lesson_close_quality");
  const closeRevisions24h = events.filter((event) => event.name === "lesson_close_revised" && event.properties.ageBand === "0-24H").length;
  const revisionRate = closeQuality.length ? Math.round((closeRevisions24h / closeQuality.length) * 10_000) / 100 : null;
  const missingRate = closeQuality.length ? Math.round((closeQuality.filter((event) => event.properties.missingFieldCount > 0).length / closeQuality.length) * 10_000) / 100 : null;
  const teacherReliability = reliability(events, "lesson_notes_finished");
  const studentReliability = reliability(events, "student_assignment_progress_finished");
  const adminReliability = reliability(events, "admin_setup_finished");
  const parentDurations = events.filter((event) => event.name === "parent_dashboard_loaded").map((event) => event.properties.durationMs);
  const parentP90 = percentile(parentDurations, 90);
  const mockExamEntries = events.filter((event) => event.name === "mock_exam_entry_completed");
  const mockEntryDurations = mockExamEntries.map((event) => event.properties.entryDurationMs);
  const mockEntryP50 = percentile(mockEntryDurations, 50);
  const mockReasonCoverage = mockExamEntries.length ? Math.round((mockExamEntries.filter((event) => event.properties.reasonCount > 0).length / mockExamEntries.length) * 10_000) / 100 : null;
  const generatedPlans = events.filter((event) => event.name === "plan_generated");
  const reviewedPlans = events.filter((event) => event.name === "plan_review_completed");
  const planAcceptance = generatedPlans.length ? Math.min(100, Math.round((reviewedPlans.filter((event) => event.properties.approved).length / generatedPlans.length) * 10_000) / 100) : null;
  const reviewDurations = reviewedPlans.map((event) => event.properties.durationMs);
  const planReviewP50 = percentile(reviewDurations, 50);
  const preferenceEvents = events.flatMap((event) => event.name === "plan_preference_updated" && event.properties.overwhelmPulse !== null ? [event] : []);
  const overwhelmRate = preferenceEvents.length ? Math.round((preferenceEvents.filter((event) => (event.properties.overwhelmPulse || 0) >= 4).length / preferenceEvents.length) * 10_000) / 100 : null;
  const digestPublished = events.filter((event) => event.name === "weekly_digest_published");
  const digestViews = events.filter((event) => event.name === "weekly_digest_viewed");
  const digestViewRate = digestPublished.length ? Math.min(100, Math.round((digestViews.length / digestPublished.length) * 10_000) / 100) : null;
  const digestFeedback = events.flatMap((event) => event.name === "weekly_digest_feedback" && event.properties.anxietyPulse !== null ? [event] : []);
  const digestAnxietyRate = digestFeedback.length ? Math.round((digestFeedback.filter((event) => (event.properties.anxietyPulse || 0) >= 4).length / digestFeedback.length) * 10_000) / 100 : null;
  const digestPreferences = events.flatMap((event) => event.name === "weekly_digest_preference_updated" ? [event] : []);
  const digestOptoutRate = digestPreferences.length ? Math.round((digestPreferences.filter((event) => !event.properties.enabled).length / digestPreferences.length) * 10_000) / 100 : null;
  const interventionTriggered = events.filter((event) => event.name === "case_rule_triggered");
  const interventionActions = events.flatMap((event) => event.name === "intervention_logged" && event.properties.timeToActionMs !== null ? [event.properties.timeToActionMs] : []);
  const interventionFirstActionP50 = percentile(interventionActions, 50);
  const interventionClosed = events.filter((event) => event.name === "case_closed");
  const interventionFalsePositive = events.filter((event) => event.name === "case_false_positive");
  const interventionDecisions = interventionClosed.length + interventionFalsePositive.length;
  const interventionFalsePositiveRate = interventionDecisions ? Math.round((interventionFalsePositive.length / interventionDecisions) * 10_000) / 100 : null;
  const interventionClosureRate = interventionTriggered.length ? Math.min(100, Math.round((interventionClosed.length / interventionTriggered.length) * 10_000) / 100) : null;
  const recoveryPublished = events.filter((event) => event.name === "recovery_package_published");
  const recoveryPublishDurations = recoveryPublished.map((event) => event.properties.publishDelayMs);
  const recoveryPublishP50 = percentile(recoveryPublishDurations, 50);
  const recoveryCompleted = events.filter((event) => event.name === "recovery_package_completed");
  const recoveryWithin72hRate = recoveryCompleted.length ? Math.round((recoveryCompleted.filter((event) => event.properties.within72h).length / recoveryCompleted.length) * 10_000) / 100 : null;
  const assignmentReviews = events.filter((event) => event.name === "assignment_review_completed");
  const assignmentFeedbackP50 = percentile(assignmentReviews.map((event) => event.properties.turnaroundMs), 50);
  const revisedAssignmentReviews = assignmentReviews.filter((event) => event.properties.revisedAttempt);
  const assignmentRevisionApproval = revisedAssignmentReviews.length ? Math.round((revisedAssignmentReviews.filter((event) => event.properties.decision === "APPROVE").length / revisedAssignmentReviews.length) * 10_000) / 100 : null;

  return [
    { key: "teacher_close_time_p50", label: "Ders kapanışı p50", sampleSize: closeDurations.length, value: closeP50, unit: "ms", target: 120_000, comparison: "lte", status: status(closeDurations.length, closeP50, 120_000, "lte") },
    { key: "teacher_close_time", label: "Ders kapanışı p90", sampleSize: closeDurations.length, value: closeP90, unit: "ms", target: 240_000, comparison: "lte", status: status(closeDurations.length, closeP90, 240_000, "lte") },
    { key: "teacher_close_revision_rate", label: "24 saatte düzeltme", sampleSize: closeQuality.length, value: revisionRate, unit: "percent", target: 10, comparison: "lte", status: status(closeQuality.length, revisionRate, 10, "lte") },
    { key: "teacher_close_missing_rate", label: "Eksik kapanış kaydı", sampleSize: closeQuality.length, value: missingRate, unit: "percent", target: 2, comparison: "lte", status: status(closeQuality.length, missingRate, 2, "lte") },
    { key: "teacher_save_reliability", label: "Ders notu kayıt başarısı", ...teacherReliability, unit: "percent", target: 99.5, comparison: "gte", status: status(teacherReliability.sampleSize, teacherReliability.value, 99.5, "gte") },
    { key: "student_progress_reliability", label: "Ödev ilerleme kayıt başarısı", ...studentReliability, unit: "percent", target: 99.5, comparison: "gte", status: status(studentReliability.sampleSize, studentReliability.value, 99.5, "gte") },
    { key: "admin_setup_reliability", label: "Grup kurulum başarısı", ...adminReliability, unit: "percent", target: 99, comparison: "gte", status: status(adminReliability.sampleSize, adminReliability.value, 99, "gte") },
    { key: "parent_dashboard_speed", label: "Veli özeti p90", sampleSize: parentDurations.length, value: parentP90, unit: "ms", target: 1_500, comparison: "lte", status: status(parentDurations.length, parentP90, 1_500, "lte") },
    { key: "mock_exam_entry_time", label: "Deneme girişi p50", sampleSize: mockEntryDurations.length, value: mockEntryP50, unit: "ms", target: 180_000, comparison: "lte", status: status(mockEntryDurations.length, mockEntryP50, 180_000, "lte") },
    { key: "mock_exam_reason_coverage", label: "Hata nedeni kapsaması", sampleSize: mockExamEntries.length, value: mockReasonCoverage, unit: "percent", target: 50, comparison: "gte", status: status(mockExamEntries.length, mockReasonCoverage, 50, "gte") },
    { key: "plan_acceptance", label: "Haftalık plan kabulü", sampleSize: generatedPlans.length, value: planAcceptance, unit: "percent", target: 65, comparison: "gte", status: status(generatedPlans.length, planAcceptance, 65, "gte") },
    { key: "plan_review_time", label: "Öğretmen plan inceleme p50", sampleSize: reviewDurations.length, value: planReviewP50, unit: "ms", target: 120_000, comparison: "lte", status: status(reviewDurations.length, planReviewP50, 120_000, "lte") },
    { key: "plan_overwhelm_rate", label: "Plan fazla geliyor pulse'u", sampleSize: preferenceEvents.length, value: overwhelmRate, unit: "percent", target: 20, comparison: "lte", status: status(preferenceEvents.length, overwhelmRate, 20, "lte") },
    { key: "digest_view_rate", label: "Haftalık özet görüntüleme", sampleSize: digestPublished.length, value: digestViewRate, unit: "percent", target: 50, comparison: "gte", status: status(digestPublished.length, digestViewRate, 50, "gte") },
    { key: "digest_anxiety_rate", label: "Özet kaygı pulse'u", sampleSize: digestFeedback.length, value: digestAnxietyRate, unit: "percent", target: 10, comparison: "lte", status: status(digestFeedback.length, digestAnxietyRate, 10, "lte") },
    { key: "digest_optout_rate", label: "Haftalık özet opt-out", sampleSize: digestPreferences.length, value: digestOptoutRate, unit: "percent", target: 15, comparison: "lte", status: status(digestPreferences.length, digestOptoutRate, 15, "lte") },
    { key: "intervention_first_action_time", label: "İlk insan aksiyonu p50", sampleSize: interventionActions.length, value: interventionFirstActionP50, unit: "ms", target: 24 * 60 * 60 * 1000, comparison: "lte", status: status(interventionActions.length, interventionFirstActionP50, 24 * 60 * 60 * 1000, "lte") },
    { key: "intervention_false_positive_rate", label: "Müdahale yanlış işaret oranı", sampleSize: interventionDecisions, value: interventionFalsePositiveRate, unit: "percent", target: 15, comparison: "lte", status: status(interventionDecisions, interventionFalsePositiveRate, 15, "lte") },
    { key: "intervention_closure_rate", label: "Müdahale sonuçla kapanma", sampleSize: interventionTriggered.length, value: interventionClosureRate, unit: "percent", target: 60, comparison: "gte", status: status(interventionTriggered.length, interventionClosureRate, 60, "gte") },
    { key: "recovery_publish_time", label: "Telafi paketi yayınlama p50", sampleSize: recoveryPublished.length, value: recoveryPublishP50, unit: "ms", target: 24 * 60 * 60 * 1000, comparison: "lte", status: status(recoveryPublished.length, recoveryPublishP50, 24 * 60 * 60 * 1000, "lte") },
    { key: "recovery_72h_completion", label: "72 saatte telafi tamamlama", sampleSize: recoveryCompleted.length, value: recoveryWithin72hRate, unit: "percent", target: 60, comparison: "gte", status: status(recoveryCompleted.length, recoveryWithin72hRate, 60, "gte") },
    { key: "assignment_feedback_time", label: "Kanıtlı ödev geri bildirimi p50", sampleSize: assignmentReviews.length, value: assignmentFeedbackP50, unit: "ms", target: 48 * 60 * 60 * 1000, comparison: "lte", status: status(assignmentReviews.length, assignmentFeedbackP50, 48 * 60 * 60 * 1000, "lte") },
    { key: "assignment_revision_approval", label: "Yeniden deneme onayı", sampleSize: revisedAssignmentReviews.length, value: assignmentRevisionApproval, unit: "percent", target: 60, comparison: "gte", status: status(revisedAssignmentReviews.length, assignmentRevisionApproval, 60, "gte") },
  ];
}
