import "server-only";

import type { CrossProductEventOutbox } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { istanbulWeekStart } from "@/lib/istanbul-time";
import { shouldCreateCoachingProjection } from "@/lib/student-success/entitlements";
import { getStudentProducts, parseEventPayload } from "@/lib/student-success/server/event-processor";

/**
 * Assignment → Koçum projection.
 * Duplicate task oluşturmaz; mevcut plana ASSIGNMENT referanslı görev ekler veya
 * adaptive plan generate sırasında candidate olarak kalır.
 */
export async function consumeAssignmentProjection(event: CrossProductEventOutbox): Promise<void> {
  const payload = parseEventPayload("ASSIGNMENT_CREATED", event.payload);

  const student = await prisma.studentProfile.findUnique({
    where: { id: event.studentId },
    select: { userId: true },
  });
  if (!student) return;

  const products = await getStudentProducts(student.userId);
  if (!shouldCreateCoachingProjection(products)) return;

  const assignment = await prisma.assignment.findUnique({
    where: { id: payload.assignmentId },
    select: { id: true, title: true, dueAt: true, description: true },
  });
  if (!assignment) return;

  const weekStart = istanbulWeekStart(assignment.dueAt);
  const plan = await prisma.weeklyPlan.findFirst({
    where: {
      studentId: event.studentId,
      weekStart,
      status: { in: ["APPROVED", "DRAFT"] },
    },
    select: { id: true, tasks: { select: { id: true, sourceType: true, sourceReferenceId: true } } },
  });
  if (!plan) return;

  const existing = plan.tasks.find(
    (task) => task.sourceType === "ASSIGNMENT" && task.sourceReferenceId === assignment.id,
  );
  if (existing) return;

  const maxPosition = plan.tasks.length;
  await prisma.weeklyPlanTask.create({
    data: {
      planId: plan.id,
      scheduledFor: assignment.dueAt,
      position: maxPosition + 1,
      title: assignment.title,
      description: assignment.description,
      durationMinutes: 30,
      sourceType: "ASSIGNMENT",
      sourceReferenceId: assignment.id,
      reasonCode: "DUE_SOON",
      taskKind: "CLASSIC_ASSIGNMENT",
      scheduleMode: "FLEXIBLE",
      dueAt: assignment.dueAt,
    },
  });
}
