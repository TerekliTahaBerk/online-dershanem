import "server-only";

import type { CrossProductEventOutbox, ProgressEvidenceSource, ProductCode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseEventPayload } from "@/lib/student-success/server/event-processor";

function productForSource(source: ProgressEvidenceSource): ProductCode {
  const map: Record<ProgressEvidenceSource, ProductCode> = {
    LESSON: "OD",
    ASSIGNMENT: "OD",
    COACHING_TASK: "OK",
    MOCK_EXAM: "ODK",
    REVIEW: "OD",
    TEACHER_ASSESSMENT: "OD",
  };
  return map[source];
}

export async function consumeEvidenceRecorder(event: CrossProductEventOutbox): Promise<void> {
  if (event.eventType === "LESSON_COMPLETED") {
    const payload = parseEventPayload("LESSON_COMPLETED", event.payload);
    const outcomes = await prisma.lessonOutcome.findMany({
      where: { lessonId: payload.lessonId, outcomeId: { in: payload.outcomeIds } },
      select: { outcomeId: true, evidenceType: true, lesson: { select: { startsAt: true, title: true } } },
    });
    for (const row of outcomes) {
      await prisma.studentProgressEvidence.upsert({
        where: {
          studentId_outcomeId_sourceType_sourceId: {
            studentId: event.studentId,
            outcomeId: row.outcomeId,
            sourceType: "LESSON",
            sourceId: payload.lessonId,
          },
        },
        create: {
          studentId: event.studentId,
          outcomeId: row.outcomeId,
          sourceType: "LESSON",
          sourceId: payload.lessonId,
          productCode: productForSource("LESSON"),
          summary: `${row.lesson.title} dersinde işlendi (${row.evidenceType}).`,
          metrics: { evidenceType: row.evidenceType },
          occurredAt: row.lesson.startsAt,
        },
        update: {
          summary: `${row.lesson.title} dersinde işlendi (${row.evidenceType}).`,
          metrics: { evidenceType: row.evidenceType },
          occurredAt: row.lesson.startsAt,
        },
      });
    }
    return;
  }

  if (event.eventType === "ASSIGNMENT_COMPLETED") {
    const payload = parseEventPayload("ASSIGNMENT_COMPLETED", event.payload);
    const assignment = await prisma.assignment.findUnique({
      where: { id: payload.assignmentId },
      select: {
        title: true,
        dueAt: true,
        outcomeLinks: { select: { outcomeId: true } },
      },
    });
    if (!assignment) return;

    const outcomeIds = payload.outcomeIds.length
      ? payload.outcomeIds
      : assignment.outcomeLinks.map((l) => l.outcomeId);

    const progress = await prisma.assignmentProgress.findUnique({
      where: { id: payload.progressId },
      select: { completedAt: true, status: true },
    });

    for (const outcomeId of outcomeIds) {
      await prisma.studentProgressEvidence.upsert({
        where: {
          studentId_outcomeId_sourceType_sourceId: {
            studentId: event.studentId,
            outcomeId,
            sourceType: "ASSIGNMENT",
            sourceId: payload.assignmentId,
          },
        },
        create: {
          studentId: event.studentId,
          outcomeId,
          sourceType: "ASSIGNMENT",
          sourceId: payload.assignmentId,
          productCode: "OD",
          summary: `${assignment.title} ödevi tamamlandı.`,
          metrics: { completed: progress?.status === "DONE", status: progress?.status },
          occurredAt: progress?.completedAt ?? event.occurredAt,
        },
        update: {
          summary: `${assignment.title} ödevi tamamlandı.`,
          metrics: { completed: progress?.status === "DONE", status: progress?.status },
          occurredAt: progress?.completedAt ?? event.occurredAt,
        },
      });
    }
    return;
  }

  if (event.eventType === "MOCK_EXAM_RESULT_PUBLISHED") {
    const payload = parseEventPayload("MOCK_EXAM_RESULT_PUBLISHED", event.payload);
    const student = await prisma.studentProfile.findUnique({
      where: { id: event.studentId },
      select: { userId: true },
    });
    if (!student) return;

    const attempt = await prisma.odkExamAttempt.findFirst({
      where: {
        examId: payload.examId,
        studentUserId: student.userId,
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        score: { is: { publicationStatus: "PUBLISHED" } },
      },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        submittedAt: true,
        exam: { select: { title: true } },
        score: {
          select: {
            outcomeScores: {
              select: {
                outcomeId: true,
                questionCount: true,
                correctCount: true,
                accuracyRate: true,
              },
            },
          },
        },
      },
    });
    if (!attempt?.score) return;

    for (const row of attempt.score.outcomeScores) {
      await prisma.studentProgressEvidence.upsert({
        where: {
          studentId_outcomeId_sourceType_sourceId: {
            studentId: event.studentId,
            outcomeId: row.outcomeId,
            sourceType: "MOCK_EXAM",
            sourceId: attempt.id,
          },
        },
        create: {
          studentId: event.studentId,
          outcomeId: row.outcomeId,
          sourceType: "MOCK_EXAM",
          sourceId: attempt.id,
          productCode: "ODK",
          summary: `${attempt.exam.title}: ${row.correctCount}/${row.questionCount} doğru.`,
          metrics: {
            questionCount: row.questionCount,
            correctCount: row.correctCount,
            accuracyRate: Number(row.accuracyRate),
          },
          occurredAt: attempt.submittedAt ?? event.occurredAt,
        },
        update: {
          summary: `${attempt.exam.title}: ${row.correctCount}/${row.questionCount} doğru.`,
          metrics: {
            questionCount: row.questionCount,
            correctCount: row.correctCount,
            accuracyRate: Number(row.accuracyRate),
          },
          occurredAt: attempt.submittedAt ?? event.occurredAt,
        },
      });
    }
  }
}
