import "server-only";

import type { CrossProductEventOutbox } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseEventPayload } from "@/lib/student-success/server/event-processor";

const TIMELINE_TITLES: Partial<Record<CrossProductEventOutbox["eventType"], string>> = {
  LESSON_COMPLETED: "Ders tamamlandı",
  LESSON_MISSED: "Ders kaçırıldı",
  ASSIGNMENT_CREATED: "Yeni ödev",
  ASSIGNMENT_COMPLETED: "Ödev tamamlandı",
  COACHING_PLAN_PUBLISHED: "Haftalık plan yayınlandı",
  COACHING_TASK_COMPLETED: "Plan görevi tamamlandı",
  MOCK_EXAM_RESULT_PUBLISHED: "Deneme sonucu yayınlandı",
};

export async function consumeTimelineWriter(event: CrossProductEventOutbox): Promise<void> {
  const title = TIMELINE_TITLES[event.eventType];
  if (!title) return;

  let summary: string | null = null;
  if (event.eventType === "MOCK_EXAM_RESULT_PUBLISHED") {
    const payload = parseEventPayload("MOCK_EXAM_RESULT_PUBLISHED", event.payload);
    const exam = await prisma.odkExam.findUnique({ where: { id: payload.examId }, select: { title: true } });
    summary = exam?.title ?? null;
  }
  if (event.eventType === "ASSIGNMENT_CREATED") {
    const payload = parseEventPayload("ASSIGNMENT_CREATED", event.payload);
    const assignment = await prisma.assignment.findUnique({ where: { id: payload.assignmentId }, select: { title: true } });
    summary = assignment?.title ?? null;
  }

  const existing = await prisma.studentTimelineEvent.findFirst({
    where: {
      studentId: event.studentId,
      kind: "OTHER",
      metadata: { path: ["crossProductEventId"], equals: event.id },
    },
    select: { id: true },
  });
  if (existing) return;

  await prisma.studentTimelineEvent.create({
    data: {
      studentId: event.studentId,
      occurredAt: event.occurredAt,
      kind: "OTHER",
      title,
      summary,
      visibility: "STAFF",
      metadata: { crossProductEventId: event.id, eventType: event.eventType },
    },
  });
}
