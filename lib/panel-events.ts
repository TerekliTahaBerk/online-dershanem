import { z } from "zod";

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
  z.object({ name: z.literal("case_rule_triggered"), properties: z.object({ ruleVersion: z.literal("intervention-v1"), reasonCode: z.enum(["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED"]) }).strict() }),
  z.object({ name: z.literal("case_opened"), properties: z.object({ actorRole: z.enum(["ADMIN", "TEACHER"]), openCountBand: z.enum(["0", "1-5", "6-20", "21+"]), overdueCountBand: z.enum(["0", "1-5", "6-20", "21+"]) }).strict() }),
  z.object({ name: z.literal("case_assigned"), properties: z.object({ ownerRole: z.enum(["ADMIN", "TEACHER"]), reasonCode: z.enum(["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED"]) }).strict() }),
  z.object({ name: z.literal("intervention_logged"), properties: z.object({ action: z.enum(["START", "LOG_ACTION", "SNOOZE", "RESOLVE", "FALSE_POSITIVE", "REOPEN"]), reasonCode: z.enum(["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED"]), timeToActionMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000).nullable(), withinSla: z.boolean().nullable(), noteProvided: z.boolean() }).strict() }),
  z.object({ name: z.literal("case_snoozed"), properties: z.object({ reasonCode: z.enum(["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED"]), days: z.union([z.literal(1), z.literal(3), z.literal(7)]) }).strict() }),
  z.object({ name: z.literal("case_closed"), properties: z.object({ reasonCode: z.enum(["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED"]), outcomeCode: z.enum(["CHECK_IN_COMPLETED", "SUPPORT_PLANNED", "PRACTICE_ADJUSTED", "FAMILY_CONTACTED", "NO_ACTION_NEEDED", "OTHER"]) }).strict() }),
  z.object({ name: z.literal("case_false_positive"), properties: z.object({ reasonCode: z.enum(["ATTENDANCE_PATTERN", "OVERDUE_WORK", "REPEATED_REVIEW_DIFFICULTY", "PLAN_STALLED"]), falsePositiveReason: z.enum(["CONTEXT_MISSING", "DATA_OUTDATED", "THRESHOLD_TOO_SENSITIVE", "DUPLICATE", "OTHER"]) }).strict() }),
  z.object({ name: z.literal("recovery_package_generated"), properties: z.object({ ruleVersion: z.literal("recovery-v1"), itemCount: z.number().int().min(0).max(5), hasMaterial: z.boolean(), hasAssignment: z.boolean(), reused: z.boolean() }).strict() }),
  z.object({ name: z.literal("recovery_package_published"), properties: z.object({ publishDelayMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000), itemCount: z.number().int().min(0).max(5), planRebalanced: z.boolean() }).strict() }),
  z.object({ name: z.literal("recovery_package_viewed"), properties: z.object({ ageMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000), itemCount: z.number().int().min(0).max(5) }).strict() }),
  z.object({ name: z.literal("recovery_item_completed"), properties: z.object({ kind: z.enum(["MATERIAL", "ASSIGNMENT"]) }).strict() }),
  z.object({ name: z.literal("recovery_checkpoint_submitted"), properties: z.object({ response: z.enum(["NOT_YET", "NEED_HELP", "READY"]) }).strict() }),
  z.object({ name: z.literal("recovery_package_completed"), properties: z.object({ completionDurationMs: z.number().int().min(0).max(365 * 24 * 60 * 60 * 1000), within72h: z.boolean(), itemCount: z.number().int().min(0).max(5) }).strict() }),
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
]);

export function isClientPanelEvent(event: PanelEventInput): boolean {
  return clientPanelEventNames.has(event.name);
}
