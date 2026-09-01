import "server-only";

import type { CrossProductEventOutbox, NotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { filterNotificationRows, queuePanelNotificationEmails, type NotificationRow } from "@/lib/panel-notifications";
import { parseEventPayload } from "@/lib/student-success/server/event-processor";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000;

async function recentNotificationExists(userId: string, dedupKey: string): Promise<boolean> {
  const since = new Date(Date.now() - DEDUP_WINDOW_MS);
  const row = await prisma.notification.findFirst({
    where: {
      userId,
      createdAt: { gte: since },
      body: { contains: dedupKey.slice(0, 80) },
    },
    select: { id: true },
  });
  return Boolean(row);
}

async function deliverNotification(rows: NotificationRow[], preferenceKey?: "assignment" | "weeklyDigest" | "lessonSummary"): Promise<void> {
  const filtered = await filterNotificationRows(rows, preferenceKey);
  if (filtered.length) await prisma.notification.createMany({ data: filtered });
  await queuePanelNotificationEmails(rows, preferenceKey);
}

/**
 * Cross-product bildirim orchestrator — aynı olay için duplicate push engeller.
 */
export async function consumeNotificationOrchestrator(event: CrossProductEventOutbox): Promise<void> {
  const student = await prisma.studentProfile.findUnique({
    where: { id: event.studentId },
    select: { userId: true },
  });
  if (!student) return;

  if (event.eventType === "COACHING_PLAN_PUBLISHED") {
    const payload = parseEventPayload("COACHING_PLAN_PUBLISHED", event.payload);
    const dedupKey = `plan:${payload.planId}`;
    if (await recentNotificationExists(student.userId, dedupKey)) return;

    await deliverNotification(
      [
        {
          userId: student.userId,
          type: "SYSTEM" as NotificationType,
          title: "Plan yayınlandı",
          body: `plan:${payload.planId} · Bu haftanın çalışma planı koçun tarafından yayınlandı.`,
          href: "/panel/ogrenci/plan",
        },
      ],
      "weeklyDigest",
    );
    return;
  }

  if (event.eventType === "ASSIGNMENT_CREATED") {
    const payload = parseEventPayload("ASSIGNMENT_CREATED", event.payload);
    const dedupKey = `assignment:${payload.assignmentId}`;
    if (await recentNotificationExists(student.userId, dedupKey)) return;
    // Kaynak mutation zaten bildirim gönderdiyse orchestrator atlar.
    return;
  }

  if (event.eventType === "MOCK_EXAM_ASSIGNED") {
    const payload = parseEventPayload("MOCK_EXAM_ASSIGNED", event.payload);
    const exam = await prisma.odkExam.findUnique({ where: { id: payload.examId }, select: { title: true } });
    const dedupKey = `mock-exam:${payload.examId}`;
    if (await recentNotificationExists(student.userId, dedupKey)) return;

    await deliverNotification(
      [
        {
          userId: student.userId,
          type: "SYSTEM" as NotificationType,
          title: "Yaklaşan deneme",
          body: `${dedupKey} · ${exam?.title ?? "Deneme"} takvimine eklendi.`,
          href: `/panel/odk/sinavlar/${payload.examId}`,
        },
      ],
    );
  }
}
