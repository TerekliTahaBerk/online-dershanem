import { z } from "zod";
import { interventionReasonCodes } from "@/lib/intervention-rules";

const smallCount = z.number().int().min(0).max(100);
const duration = z.number().int().min(0).max(8 * 60 * 60 * 1000);
const operationDuration = z.number().int().min(0).max(5 * 60 * 1000);
const operationOutcome = z.enum(["success", "validation", "rejected", "system_error"]);

export const panelEventSchema = z.discriminatedUnion("name", [
  z.object({
    name: z.literal("lesson_close_started"),
    properties: z.object({
      groupSize: smallCount,
      initialStatus: z.enum(["PLANNED", "COMPLETED"]),
    }).strict(),
  }),
  z.object({
    name: z.literal("lesson_close_reopened"),
    properties: z.object({ groupSize: smallCount }).strict(),
  }),
  z.object({
    name: z.literal("lesson_close_completed"),
    properties: z.object({
      durationMs: duration,
      groupSize: smallCount,
      changedStudentCount: smallCount,
      privateNoteCount: smallCount,
      filledSharedFieldCount: z.number().int().min(0).max(4),
      draftSaveCount: smallCount,
      interactionCount: z.number().int().min(0).max(1000),
      templateApplied: z.boolean(),
      previousGoalUsed: z.boolean(),
      quickCloseEnabled: z.boolean().optional(),
      exceptionCount: smallCount.optional(),
      assignmentRecipientCount: smallCount.optional(),
    }).strict(),
  }),
  z.object({
    name: z.literal("lesson_close_quality"),
    properties: z.object({ missingFieldCount: z.number().int().min(0).max(4), exceptionCount: smallCount, assignmentRecipientCount: smallCount, outcomeLinked: z.boolean() }).strict(),
  }),
  z.object({
    name: z.literal("lesson_close_revised"),
    properties: z.object({ ageBand: z.enum(["0-24H", "25H-7D", "8D+"]) }).strict(),
  }),
  z.object({
    name: z.literal("lesson_close_conflict"),
    properties: z.object({ reason: z.enum(["VERSION", "IDEMPOTENCY_REUSE"]) }).strict(),
  }),
  z.object({
    name: z.literal("lesson_autosave_failed"),
    properties: z.object({
      groupSize: smallCount,
      completionAttempt: z.boolean(),
    }).strict(),
  }),
  z.object({
    name: z.literal("lesson_notes_finished"),
    properties: z.object({
      durationMs: operationDuration,
      outcome: operationOutcome,
      completionAttempt: z.boolean(),
      groupSize: smallCount,
      privateNoteCount: smallCount,
      filledSharedFieldCount: z.number().int().min(0).max(4),
    }).strict(),
  }),
  z.object({
    name: z.literal("admin_setup_finished"),
    properties: z.object({
      durationMs: operationDuration,
      outcome: operationOutcome,
      studentCount: z.number().int().min(0).max(4),
      parentLinkCount: z.number().int().min(0).max(8),
      lessonCount: z.number().int().min(0).max(12),
    }).strict(),
  }),
  z.object({
    name: z.literal("student_assignment_progress_finished"),
    properties: z.object({
      durationMs: operationDuration,
      outcome: operationOutcome,
      targetStatus: z.enum(["TODO", "IN_PROGRESS", "DONE", "UNKNOWN"]),
    }).strict(),
  }),
  z.object({
    name: z.literal("parent_dashboard_loaded"),
    properties: z.object({
      durationMs: operationDuration,
      childCountBand: z.enum(["0", "1", "2-4", "5+"]),
      hasActiveEnrollment: z.boolean(),
    }).strict(),
  }),
  z.object({
    name: z.literal("curriculum_link_saved"),
    properties: z.object({
      targetType: z.enum(["LESSON", "ASSIGNMENT"]),
      outcomeCount: z.number().int().min(0).max(3),
      needsReviewCount: z.number().int().min(0).max(3),
      skipReason: z.enum(["NONE", "CATALOG_MISSING", "COMPLETE_LATER", "NOT_APPLICABLE"]),
    }).strict(),
  }),
  z.object({
    name: z.literal("mock_exam_entry_started"),
    properties: z.object({ examType: z.enum(["LGS", "TYT", "AYT", "YDT"]), actorRole: z.enum(["ADMIN", "TEACHER", "STUDENT"]) }).strict(),
  }),
  z.object({
    name: z.literal("mock_exam_entry_completed"),
    properties: z.object({ examType: z.enum(["LGS", "TYT", "AYT", "YDT"]), entryDurationMs: z.number().int().min(0).max(30 * 60 * 1000), sectionCount: z.number().int().min(1).max(8), reasonCount: z.number().int().min(0).max(3), source: z.enum(["MANUAL", "PASTE"]) }).strict(),
  }),
  z.object({
    name: z.literal("mock_exam_import_failed"),
    properties: z.object({ examType: z.enum(["LGS", "TYT", "AYT", "YDT"]), reason: z.enum(["ROW_COUNT", "FORMAT", "TOTAL_MISMATCH"]) }).strict(),
  }),
  z.object({ name: z.literal("odk_attempt_started"), properties: z.object({ family: z.enum(["LGS", "TYT", "AYT"]), resumed: z.boolean(), lateEntryBand: z.enum(["ON_TIME", "1-5M", "6M+"]) }).strict() }),
  z.object({ name: z.literal("odk_attempt_submitted"), properties: z.object({ family: z.enum(["LGS", "TYT", "AYT"]), mode: z.enum(["MANUAL", "AUTO"]), answeredBand: z.enum(["0", "1-10", "11-20", "21-40"]), durationBand: z.enum(["0-30M", "31-60M", "61M+"]) }).strict() }),
  z.object({ name: z.literal("odk_exam_scored"), properties: z.object({ family: z.enum(["LGS", "TYT", "AYT"]), attemptBand: z.enum(["0", "1-10", "11-50", "51+"]) }).strict() }),
  z.object({ name: z.literal("odk_results_released"), properties: z.object({ family: z.enum(["LGS", "TYT", "AYT"]), attemptBand: z.enum(["0", "1-10", "11-50", "51+"]) }).strict() }),
  z.object({
    name: z.literal("error_reason_revised"),
    properties: z.object({ examType: z.enum(["LGS", "TYT", "AYT", "YDT"]), actorRole: z.enum(["ADMIN", "TEACHER", "STUDENT"]), changedCount: z.number().int().min(1).max(6), reasonCount: z.number().int().min(0).max(3) }).strict(),
  }),
  z.object({
    name: z.literal("mock_heatmap_viewed"),
    properties: z.object({ examType: z.enum(["LGS", "TYT", "AYT", "YDT", "MIXED"]), examCountBand: z.enum(["0", "1", "2-3", "4+"]) }).strict(),
  }),
  z.object({
    name: z.literal("review_items_created"),
    properties: z.object({ sourceType: z.enum(["MOCK_EXAM_SECTION", "LESSON_OUTCOME", "TEACHER_REFERENCE"]), itemCount: z.number().int().min(1).max(24) }).strict(),
  }),
  z.object({
    name: z.literal("review_item_answered"),
    properties: z.object({ response: z.enum(["WRONG", "UNSURE", "CORRECT"]), stageBefore: z.number().int().min(0).max(4), stageAfter: z.number().int().min(0).max(4), nextIntervalDays: z.union([z.literal(0), z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30)]), ageBand: z.enum(["0-7", "8-30", "31+"]), mastered: z.boolean() }).strict(),
  }),
  z.object({
    name: z.literal("review_item_deferred"),
    properties: z.object({ deferDays: z.literal(1) }).strict(),
  }),
  z.object({
    name: z.literal("review_queue_viewed"),
    properties: z.object({ actorRole: z.enum(["STUDENT", "TEACHER"]), dueCountBand: z.enum(["0", "1-5", "6-20", "21+"]), activeCountBand: z.enum(["0", "1-5", "6-20", "21+"]) }).strict(),
  }),
  z.object({
    name: z.literal("plan_generated"),
    properties: z.object({ ruleVersion: z.literal("adaptive-v1"), taskCount: z.number().int().min(0).max(21), capacityMinutes: z.number().int().min(0).max(7 * 180), reasonCount: z.number().int().min(0).max(5), rebalanced: z.boolean() }).strict(),
  }),
  z.object({
    name: z.literal("plan_review_completed"),
    properties: z.object({ durationMs: z.number().int().min(0).max(30 * 60 * 1000), taskCount: z.number().int().min(0).max(21), approved: z.boolean() }).strict(),
  }),
  z.object({
    name: z.literal("plan_change_requested"),
    properties: z.object({ category: z.enum(["TOO_MUCH", "WRONG_DAYS", "PRIORITY", "OTHER"]) }).strict(),
  }),
  z.object({
    name: z.literal("plan_task_completed"),
    properties: z.object({ sourceType: z.enum(["ASSIGNMENT", "REVIEW", "WEAK_OUTCOME", "EXAM_PREP", "RECOVERY"]), reasonCode: z.enum(["DUE_SOON", "REVIEW_DUE", "NEEDS_REVIEW", "EXAM_APPROACHING", "CAPACITY_BALANCE", "MISSED_LESSON"]) }).strict(),
  }),
  z.object({
    name: z.literal("plan_preference_updated"),
    properties: z.object({ availableDayCount: z.number().int().min(1).max(7), minutesPerDay: z.number().int().min(15).max(180), planningEnabled: z.boolean(), overwhelmPulse: z.number().int().min(1).max(5).nullable() }).strict(),
  }),
  z.object({ name: z.literal("weekly_digest_generated"), properties: z.object({ ruleVersion: z.literal("calm-digest-v1"), trendBand: z.enum(["IMPROVING", "STEADY", "BUILDING", "LIMITED_DATA"]), reused: z.boolean() }).strict() }),
  z.object({ name: z.literal("weekly_digest_published"), properties: z.object({ trendBand: z.enum(["IMPROVING", "STEADY", "BUILDING", "LIMITED_DATA"]), recipientBand: z.enum(["1", "2-3", "4+"])}).strict() }),
  z.object({ name: z.literal("weekly_digest_viewed"), properties: z.object({ actorRole: z.enum(["STUDENT", "PARENT"]), trendBand: z.enum(["IMPROVING", "STEADY", "BUILDING", "LIMITED_DATA"]), ageBand: z.enum(["0-2D", "3-7D", "8D+"])}).strict() }),
  z.object({ name: z.literal("weekly_digest_feedback"), properties: z.object({ actorRole: z.enum(["STUDENT", "PARENT"]), helpful: z.boolean().nullable(), anxietyPulse: z.number().int().min(1).max(5).nullable() }).strict() }),
  z.object({ name: z.literal("weekly_digest_preference_updated"), properties: z.object({ actorRole: z.enum(["STUDENT", "PARENT"]), enabled: z.boolean(), emailEnabled: z.boolean() }).strict() }),
  z.object({ name: z.literal("case_rule_triggered"), properties: z.object({ ruleVersion: z.literal("intervention-v1"), reasonCode: z.enum(interventionReasonCodes) }).strict() }),
  z.object({ name: z.literal("case_opened"), properties: z.object({ actorRole: z.enum(["ADMIN", "TEACHER"]), openCountBand: z.enum(["0", "1-5", "6-20", "21+"]), overdueCountBand: z.enum(["0", "1-5", "6-20", "21+"]) }).strict() }),
  z.object({ name: z.literal("case_assigned"), properties: z.object({ ownerRole: z.enum(["ADMIN", "TEACHER"]), reasonCode: z.enum(interventionReasonCodes) }).strict() }),
  z.object({ name: z.literal("intervention_logged"), properties: z.object({ action: z.enum(["START", "LOG_ACTION", "SNOOZE", "RESOLVE", "FALSE_POSITIVE", "REOPEN"]), reasonCode: z.enum(interventionReasonCodes), timeToActionMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000).nullable(), withinSla: z.boolean().nullable(), noteProvided: z.boolean() }).strict() }),
  z.object({ name: z.literal("case_snoozed"), properties: z.object({ reasonCode: z.enum(interventionReasonCodes), days: z.union([z.literal(1), z.literal(3), z.literal(7)]) }).strict() }),
  z.object({ name: z.literal("case_closed"), properties: z.object({ reasonCode: z.enum(interventionReasonCodes), outcomeCode: z.enum(["CHECK_IN_COMPLETED", "SUPPORT_PLANNED", "PRACTICE_ADJUSTED", "FAMILY_CONTACTED", "NO_ACTION_NEEDED", "OTHER"]) }).strict() }),
  z.object({ name: z.literal("case_false_positive"), properties: z.object({ reasonCode: z.enum(interventionReasonCodes), falsePositiveReason: z.enum(["CONTEXT_MISSING", "DATA_OUTDATED", "THRESHOLD_TOO_SENSITIVE", "DUPLICATE", "OTHER"]) }).strict() }),
  z.object({ name: z.literal("recovery_package_generated"), properties: z.object({ ruleVersion: z.literal("recovery-v1"), itemCount: z.number().int().min(0).max(5), hasMaterial: z.boolean(), hasAssignment: z.boolean(), reused: z.boolean() }).strict() }),
  z.object({ name: z.literal("recovery_package_published"), properties: z.object({ publishDelayMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000), itemCount: z.number().int().min(0).max(5), planRebalanced: z.boolean() }).strict() }),
  z.object({ name: z.literal("recovery_package_viewed"), properties: z.object({ ageMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000), itemCount: z.number().int().min(0).max(5) }).strict() }),
  z.object({ name: z.literal("recovery_item_completed"), properties: z.object({ kind: z.enum(["MATERIAL", "ASSIGNMENT"]) }).strict() }),
  z.object({ name: z.literal("recovery_checkpoint_submitted"), properties: z.object({ response: z.enum(["NOT_YET", "NEED_HELP", "READY"]) }).strict() }),
  z.object({ name: z.literal("recovery_package_completed"), properties: z.object({ completionDurationMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000), within72h: z.boolean(), itemCount: z.number().int().min(0).max(5) }).strict() }),
  z.object({ name: z.literal("assignment_evidence_submitted"), properties: z.object({ attemptBand: z.enum(["1", "2", "3+"]), characterBand: z.enum(["20-199", "200-499", "500+"]), late: z.boolean(), replayed: z.boolean() }).strict() }),
  z.object({ name: z.literal("assignment_review_completed"), properties: z.object({ decision: z.enum(["APPROVE", "REQUEST_CHANGES"]), turnaroundMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000), criterionCount: z.number().int().min(2).max(4), interactionDurationMs: z.number().int().min(0).max(30 * 60 * 1000), revisedAttempt: z.boolean() }).strict() }),
  z.object({ name: z.literal("student_check_in_submitted"), properties: z.object({ energy: z.enum(["LOW", "STEADY", "GOOD"]), confidence: z.enum(["NEED_GUIDANCE", "BUILDING", "CONFIDENT"]), barrier: z.enum(["NONE", "NOT_UNDERSTANDING", "TIME_LOAD", "ACCESS_TECH", "NEED_EXAMPLE", "OTHER"]), sharedWithTeacher: z.boolean(), helpRequested: z.boolean(), weeklyCount: z.number().int().min(1).max(2) }).strict() }),
  z.object({ name: z.literal("student_help_inbox_viewed"), properties: z.object({ openCountBand: z.enum(["0", "1-5", "6-20", "21+"]), overdueCountBand: z.enum(["0", "1-5", "6-20", "21+"]) }).strict() }),
  z.object({ name: z.literal("student_help_responded"), properties: z.object({ action: z.enum(["NEXT_LESSON", "EXTRA_EXAMPLE", "PLAN_ADJUSTED", "SHORT_CHECKIN", "RESOURCE_SHARED", "NO_ACTION_NEEDED"]), responseTimeMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000), within24h: z.boolean(), responseNumber: z.number().int().min(1).max(20), firstResponse: z.boolean() }).strict() }),
  z.object({ name: z.literal("student_help_feedback"), properties: z.object({ helpful: z.boolean() }).strict() }),
  z.object({ name: z.literal("accessibility_preferences_updated"), properties: z.object({ activePreferenceCount: z.number().int().min(0).max(6), reducedMotion: z.boolean(), highContrast: z.boolean(), largeText: z.boolean(), comfortableSpacing: z.boolean(), captionsPreferred: z.boolean(), transcriptPreferred: z.boolean() }).strict() }),
  z.object({ name: z.literal("academic_accommodation_updated"), properties: z.object({ extraTimePercent: z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(100)]), breaksAllowed: z.boolean() }).strict() }),
  z.object({ name: z.literal("network_preferences_updated"), properties: z.object({ lowDataMode: z.boolean(), offlineWritesEnabled: z.boolean() }).strict() }),
  z.object({ name: z.literal("offline_write_queued"), properties: z.object({ operation: z.enum(["LESSON_CLOSE", "ASSIGNMENT_PROGRESS"]), payloadSizeBand: z.enum(["0-4KB", "5-16KB", "17-64KB"]) }).strict() }),
  z.object({ name: z.literal("offline_write_synced"), properties: z.object({ operation: z.enum(["LESSON_CLOSE", "ASSIGNMENT_PROGRESS"]), queueAgeBand: z.enum(["0-1M", "2-15M", "16M-24H"]), attemptBand: z.enum(["1", "2-3", "4+"]) }).strict() }),
  z.object({ name: z.literal("offline_write_conflicted"), properties: z.object({ operation: z.enum(["LESSON_CLOSE", "ASSIGNMENT_PROGRESS"]), conflictType: z.enum(["VERSION", "REJECTED", "EXPIRED"]) }).strict() }),
  z.object({ name: z.literal("cohort_quality_viewed"), properties: z.object({ ruleVersion: z.literal("cohort-gain-v1"), readyCohortCount: z.number().int().min(0).max(4), suppressedCohortCount: z.number().int().min(0).max(4), pairedStudentBand: z.enum(["0-9", "10-24", "25-99", "100+"]) }).strict() }),
  z.object({ name: z.literal("ai_draft_requested"), properties: z.object({ promptVersion: z.literal("teacher-draft-v1"), taskType: z.enum(["ASSIGNMENT", "MINI_CHECK"]), sourceCount: z.number().int().min(1).max(8), redactionBand: z.enum(["0", "1-2", "3+"]) }).strict() }),
  z.object({ name: z.literal("ai_draft_generated"), properties: z.object({ taskType: z.enum(["ASSIGNMENT", "MINI_CHECK"]), provider: z.enum(["OPENAI", "GEMINI", "FALLBACK", "STUB"]), latencyBand: z.enum(["0-2S", "2-8S", "8S+"]), citationCount: z.number().int().min(1).max(6), fallbackReason: z.enum(["NONE", "PROVIDER_DISABLED", "EXTERNAL_TRANSFER_NOT_READY", "COST_CONFIG_MISSING", "PROMPT_INJECTION", "DAILY_QUOTA", "E2E_STUB", "PROVIDER_ERROR", "SAFETY_OR_PARSE"]), costBand: z.enum(["UNKNOWN", "0", "1-999", "1000+"]) }).strict() }),
  z.object({ name: z.literal("ai_draft_reviewed"), properties: z.object({ taskType: z.enum(["ASSIGNMENT", "MINI_CHECK"]), provider: z.enum(["OPENAI", "GEMINI", "FALLBACK", "STUB"]), action: z.enum(["ACCEPT", "EDIT", "REJECT", "FLAG"]), changedFieldCount: z.number().int().min(0).max(4), reviewAgeBand: z.enum(["0-5M", "6M-24H", "24H+"]) }).strict() }),
  z.object({ name: z.literal("pilot_cohort_changed"), properties: z.object({ action: z.enum(["CREATED", "ACTIVATE", "PAUSE", "RESUME", "COMPLETE", "ROLLBACK"]), memberBand: z.enum(["1-4", "5-12", "13+"]), fourRoleCoverage: z.boolean(), readiness: z.enum(["PASS", "WAIT", "BLOCK"]) }).strict() }),
]);

export type PanelEventInput = z.infer<typeof panelEventSchema>;

const clientPanelEventNames = new Set<PanelEventInput["name"]>([
  "lesson_close_started",
  "lesson_close_reopened",
  "lesson_close_completed",
  "lesson_autosave_failed",
  "mock_exam_entry_started",
  "mock_exam_import_failed",
  "mock_heatmap_viewed",
  "review_queue_viewed",
  "plan_review_completed",
  "offline_write_queued",
  "offline_write_synced",
  "offline_write_conflicted",
]);

export function isClientPanelEvent(event: PanelEventInput): boolean {
  return clientPanelEventNames.has(event.name);
}
