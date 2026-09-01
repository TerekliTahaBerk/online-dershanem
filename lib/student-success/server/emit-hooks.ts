import "server-only";

import { prisma } from "@/lib/prisma";
import { emitCrossProductEvent } from "@/lib/student-success/server/outbox";

export async function onAssignmentCreated(input: {
  assignmentId: string;
  groupId: string;
  dueAt: Date;
  outcomeIds: string[];
  actorUserId: string;
  studentIds: string[];
}): Promise<void> {
  for (const studentId of input.studentIds) {
    await emitCrossProductEvent({
      eventType: "ASSIGNMENT_CREATED",
      actorUserId: input.actorUserId,
      studentId,
      entityType: "Assignment",
      entityId: input.assignmentId,
      payload: {
        eventVersion: 1,
        assignmentId: input.assignmentId,
        groupId: input.groupId,
        dueAt: input.dueAt.toISOString(),
        outcomeIds: input.outcomeIds,
      },
    });
  }
}

export async function onAssignmentCompleted(input: {
  assignmentId: string;
  progressId: string;
  studentId: string;
  actorUserId?: string;
  outcomeIds?: string[];
}): Promise<void> {
  const outcomeLinks = input.outcomeIds?.length
    ? input.outcomeIds
    : (
        await prisma.assignmentOutcome.findMany({
          where: { assignmentId: input.assignmentId },
          select: { outcomeId: true },
        })
      ).map((row) => row.outcomeId);

  await emitCrossProductEvent({
    eventType: "ASSIGNMENT_COMPLETED",
    actorUserId: input.actorUserId,
    studentId: input.studentId,
    entityType: "AssignmentProgress",
    entityId: input.progressId,
    payload: {
      eventVersion: 1,
      assignmentId: input.assignmentId,
      progressId: input.progressId,
      outcomeIds: outcomeLinks,
    },
  });
}

export async function onLessonCompleted(input: {
  lessonId: string;
  groupId: string;
  topic: string | null;
  outcomeIds: string[];
  actorUserId: string;
  presentStudentIds: string[];
}): Promise<void> {
  for (const studentId of input.presentStudentIds) {
    await emitCrossProductEvent({
      eventType: "LESSON_COMPLETED",
      actorUserId: input.actorUserId,
      studentId,
      entityType: "Lesson",
      entityId: input.lessonId,
      payload: {
        eventVersion: 1,
        lessonId: input.lessonId,
        groupId: input.groupId,
        outcomeIds: input.outcomeIds,
        topic: input.topic,
      },
    });
  }
}

export async function onLessonMissed(input: {
  lessonId: string;
  groupId: string;
  studentId: string;
  recoveryPackageId?: string | null;
  actorUserId?: string;
}): Promise<void> {
  await emitCrossProductEvent({
    eventType: "LESSON_MISSED",
    actorUserId: input.actorUserId,
    studentId: input.studentId,
    entityType: "Lesson",
    entityId: input.lessonId,
    payload: {
      eventVersion: 1,
      lessonId: input.lessonId,
      groupId: input.groupId,
      recoveryPackageId: input.recoveryPackageId ?? null,
    },
  });
}

export async function onMockExamResultPublished(input: {
  examId: string;
  actorUserId: string;
  studentIds: string[];
  attemptCount: number;
}): Promise<void> {
  for (const studentId of input.studentIds) {
    await emitCrossProductEvent({
      eventType: "MOCK_EXAM_RESULT_PUBLISHED",
      actorUserId: input.actorUserId,
      studentId,
      entityType: "OdkExam",
      entityId: input.examId,
      payload: {
        eventVersion: 1,
        examId: input.examId,
        attemptCount: input.attemptCount,
      },
    });
  }
}

export async function onCoachingPlanPublished(input: {
  planId: string;
  studentId: string;
  weekStart: Date;
  taskCount: number;
  actorUserId: string;
}): Promise<void> {
  await emitCrossProductEvent({
    eventType: "COACHING_PLAN_PUBLISHED",
    actorUserId: input.actorUserId,
    studentId: input.studentId,
    entityType: "WeeklyPlan",
    entityId: input.planId,
    payload: {
      eventVersion: 1,
      planId: input.planId,
      weekStart: input.weekStart.toISOString(),
      taskCount: input.taskCount,
    },
  });
}
