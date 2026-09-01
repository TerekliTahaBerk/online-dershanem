import "server-only";

import type { ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";
import { filterCalendarByInclude, sortCalendarEvents } from "@/lib/student-success/calendar";
import type { UnifiedCalendarEvent } from "@/lib/student-success/types";
import { STUDENT_SUCCESS_PRODUCT_LABELS } from "@/lib/student-success/types";
import { getStudentProducts } from "@/lib/student-success/server/event-processor";

export type GetStudentCalendarInput = {
  studentId: string;
  studentUserId: string;
  from: Date;
  to: Date;
  include?: Array<"lessons" | "assignments" | "coachingTasks" | "mockExams" | "coachingSessions">;
  products?: ProductCode[];
};

export async function getStudentCalendar(input: GetStudentCalendarInput): Promise<UnifiedCalendarEvent[]> {
  const products = input.products ?? (await getStudentProducts(input.studentUserId));
  const include = input.include ?? ["lessons", "assignments", "coachingTasks", "mockExams"];
  const events: UnifiedCalendarEvent[] = [];

  if (products.includes("OD") && include.includes("lessons")) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: input.studentId, endedAt: null },
      select: { groupId: true },
    });
    const groupIds = enrollments.map((e) => e.groupId);
    if (groupIds.length) {
      const lessons = await prisma.lesson.findMany({
        where: {
          groupId: { in: groupIds },
          startsAt: { gte: input.from, lt: input.to },
          status: { not: "CANCELLED" },
        },
        select: { id: true, title: true, startsAt: true, endsAt: true, group: { select: { subject: true } } },
      });
      for (const lesson of lessons) {
        events.push({
          id: `lesson:${lesson.id}`,
          type: "LESSON",
          product: "OD",
          productLabel: STUDENT_SUCCESS_PRODUCT_LABELS.OD,
          title: lesson.title,
          description: lesson.group.subject,
          startsAt: lesson.startsAt,
          endsAt: lesson.endsAt,
          href: `/panel/ogrenci/dersler/${lesson.id}`,
          sourceId: lesson.id,
          sourceType: "Lesson",
        });
      }
    }
  }

  if (products.includes("OD") && include.includes("assignments")) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: input.studentId, endedAt: null },
      select: { groupId: true },
    });
    const groupIds = enrollments.map((e) => e.groupId);
    if (groupIds.length) {
      const assignments = await prisma.assignment.findMany({
        where: {
          isActive: true,
          groupId: { in: groupIds },
          dueAt: { gte: input.from, lt: input.to },
        },
        select: { id: true, title: true, dueAt: true },
      });
      for (const assignment of assignments) {
        events.push({
          id: `assignment:${assignment.id}`,
          type: "ASSIGNMENT_DUE",
          product: "OD",
          productLabel: STUDENT_SUCCESS_PRODUCT_LABELS.OD,
          title: assignment.title,
          description: "Son tarih",
          startsAt: assignment.dueAt,
          endsAt: null,
          href: "/panel/ogrenci/odevler",
          sourceId: assignment.id,
          sourceType: "Assignment",
        });
      }
    }
  }

  if (products.includes("OK") && include.includes("coachingTasks")) {
    const plans = await prisma.weeklyPlan.findMany({
      where: { studentId: input.studentId, status: "APPROVED" },
      select: {
        tasks: {
          where: { scheduledFor: { gte: input.from, lt: input.to }, status: { not: "SKIPPED" } },
          select: { id: true, title: true, scheduledFor: true, durationMinutes: true, sourceType: true, sourceReferenceId: true },
        },
      },
    });
    for (const plan of plans) {
      for (const task of plan.tasks) {
        const end = new Date(task.scheduledFor.getTime() + task.durationMinutes * 60000);
        events.push({
          id: `coaching-task:${task.id}`,
          type: "COACHING_TASK",
          product: "OK",
          productLabel: STUDENT_SUCCESS_PRODUCT_LABELS.OK,
          title: task.title,
          description: task.sourceType === "ASSIGNMENT" ? "Dershanem ödevi (referans)" : null,
          startsAt: task.scheduledFor,
          endsAt: end,
          href: "/panel/ogrenci/plan",
          sourceId: task.id,
          sourceType: "WeeklyPlanTask",
        });
      }
    }
  }

  if (products.includes("ODK") && include.includes("mockExams")) {
    const odkAssignments = await prisma.odkExamAssignment.findMany({
      where: { studentUserId: input.studentUserId },
      select: {
        exam: {
          select: { id: true, title: true, startsAt: true, endsAt: true, status: true },
        },
      },
    });
    for (const row of odkAssignments) {
      const exam = row.exam;
      if (!exam.startsAt || exam.startsAt < input.from || exam.startsAt >= input.to) continue;
      if (exam.status === "ARCHIVED") continue;
      events.push({
        id: `mock-exam:${exam.id}`,
        type: "MOCK_EXAM",
        product: "ODK",
        productLabel: STUDENT_SUCCESS_PRODUCT_LABELS.ODK,
        title: exam.title,
        description: null,
        startsAt: exam.startsAt,
        endsAt: exam.endsAt,
        href: `/panel/odk/sinavlar/${exam.id}`,
        sourceId: exam.id,
        sourceType: "OdkExam",
      });
    }
  }

  const filtered = filterCalendarByInclude(events, include);
  return sortCalendarEvents(filtered);
}

export async function getStudentToday(input: {
  studentId: string;
  studentUserId: string;
  now?: Date;
}): Promise<{ events: UnifiedCalendarEvent[]; dayStart: Date; dayEnd: Date }> {
  const now = input.now ?? new Date();
  const dayStart = istanbulDayStart(now);
  const dayEnd = istanbulNextDayStart(now);
  const weekEnd = new Date(dayEnd.getTime() + 7 * 86400000);
  const events = await getStudentCalendar({
    studentId: input.studentId,
    studentUserId: input.studentUserId,
    from: dayStart,
    to: weekEnd,
  });
  return { events, dayStart, dayEnd };
}
