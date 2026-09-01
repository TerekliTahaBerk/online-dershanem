/**
 * Cross-product domain events — tip güvenli sözleşmeler.
 *
 * Her event id, type, actor, studentId, entityId, occurredAt ve payload version taşır.
 */

import { z } from "zod";

export const CROSS_PRODUCT_EVENT_TYPES = [
  "LESSON_COMPLETED",
  "LESSON_MISSED",
  "ASSIGNMENT_CREATED",
  "ASSIGNMENT_COMPLETED",
  "ASSIGNMENT_EVALUATED",
  "COACHING_PLAN_PUBLISHED",
  "COACHING_TASK_COMPLETED",
  "MOCK_EXAM_ASSIGNED",
  "MOCK_EXAM_COMPLETED",
  "MOCK_EXAM_RESULT_PUBLISHED",
  "OUTCOME_MASTERY_CHANGED",
  "INTERVENTION_CREATED",
] as const;

export type CrossProductEventType = (typeof CROSS_PRODUCT_EVENT_TYPES)[number];

export const CURRENT_EVENT_VERSION = 1;

const basePayload = z.object({ eventVersion: z.literal(CURRENT_EVENT_VERSION) }).strict();

export const eventPayloadSchemas = {
  LESSON_COMPLETED: basePayload.extend({
    lessonId: z.string(),
    groupId: z.string(),
    outcomeIds: z.array(z.string()),
    topic: z.string().nullable(),
  }).strict(),
  LESSON_MISSED: basePayload.extend({
    lessonId: z.string(),
    groupId: z.string(),
    recoveryPackageId: z.string().nullable(),
  }).strict(),
  ASSIGNMENT_CREATED: basePayload.extend({
    assignmentId: z.string(),
    groupId: z.string(),
    dueAt: z.string().datetime(),
    outcomeIds: z.array(z.string()),
  }).strict(),
  ASSIGNMENT_COMPLETED: basePayload.extend({
    assignmentId: z.string(),
    progressId: z.string(),
    outcomeIds: z.array(z.string()),
  }).strict(),
  ASSIGNMENT_EVALUATED: basePayload.extend({
    assignmentId: z.string(),
    submissionId: z.string(),
    outcomeIds: z.array(z.string()),
  }).strict(),
  COACHING_PLAN_PUBLISHED: basePayload.extend({
    planId: z.string(),
    weekStart: z.string().datetime(),
    taskCount: z.number().int(),
  }).strict(),
  COACHING_TASK_COMPLETED: basePayload.extend({
    taskId: z.string(),
    planId: z.string(),
    sourceType: z.string(),
    sourceReferenceId: z.string().nullable(),
  }).strict(),
  MOCK_EXAM_ASSIGNED: basePayload.extend({
    examId: z.string(),
    assignmentId: z.string().nullable(),
    startsAt: z.string().datetime().nullable(),
  }).strict(),
  MOCK_EXAM_COMPLETED: basePayload.extend({
    attemptId: z.string(),
    examId: z.string(),
  }).strict(),
  MOCK_EXAM_RESULT_PUBLISHED: basePayload.extend({
    examId: z.string(),
    attemptCount: z.number().int(),
  }).strict(),
  OUTCOME_MASTERY_CHANGED: basePayload.extend({
    outcomeId: z.string(),
    previousStatus: z.string().nullable(),
    newStatus: z.string(),
  }).strict(),
  INTERVENTION_CREATED: basePayload.extend({
    interventionId: z.string(),
    reasonCodes: z.array(z.string()),
  }).strict(),
} as const satisfies Record<CrossProductEventType, z.ZodType>;

export type CrossProductEventPayload<T extends CrossProductEventType = CrossProductEventType> =
  z.infer<(typeof eventPayloadSchemas)[T]>;

export type EmitCrossProductEventInput<T extends CrossProductEventType = CrossProductEventType> = {
  eventType: T;
  actorUserId?: string | null;
  studentId: string;
  entityType: string;
  entityId: string;
  occurredAt?: Date;
  payload: CrossProductEventPayload<T>;
  deduplicationKey?: string;
};

/** Deterministic deduplication key — aynı event iki kez işlenmez. */
export function buildDeduplicationKey(input: {
  eventType: CrossProductEventType;
  studentId: string;
  entityType: string;
  entityId: string;
  suffix?: string;
}): string {
  const parts = [input.eventType, input.studentId, input.entityType, input.entityId];
  if (input.suffix) parts.push(input.suffix);
  return parts.join(":");
}

export function validateEventPayload<T extends CrossProductEventType>(
  eventType: T,
  payload: unknown,
): CrossProductEventPayload<T> {
  return eventPayloadSchemas[eventType].parse(payload) as CrossProductEventPayload<T>;
}

export const EVENT_CONSUMER_KEYS = [
  "assignment-projection",
  "lesson-close-suggestions",
  "lesson-missed-recovery",
  "mock-exam-coach-bridge",
  "mock-exam-assigned-calendar",
  "evidence-recorder",
  "mastery-rescore",
  "intervention-engine",
  "timeline-writer",
  "notification-orchestrator",
] as const;

export type EventConsumerKey = (typeof EVENT_CONSUMER_KEYS)[number];
