/**
 * ODK → Online Koçum suggestion bridge.
 * Otomatik plan publish etmez; yalnız PENDING WeeklyPlanSuggestion üretir.
 */

import { prisma } from "@/lib/prisma";
import { istanbulWeekStart } from "@/lib/istanbul-time";
import { buildCoachSuggestions } from "@/lib/odk/coach-suggestions";

export async function createCoachSuggestionsFromReleasedExam(examId: string, now = new Date()) {
  const weekStart = istanbulWeekStart(now);
  const attempts = await prisma.odkExamAttempt.findMany({
    where: {
      examId,
      status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
      score: { is: { publicationStatus: "PUBLISHED" } },
    },
    select: {
      studentUserId: true,
      score: {
        select: {
          outcomeScores: {
            select: {
              questionCount: true,
              correctCount: true,
              accuracyRate: true,
              outcome: { select: { code: true, title: true, unit: { select: { name: true } } } },
            },
          },
        },
      },
      student: {
        select: {
          studentProfile: { select: { id: true } },
          productMemberships: {
            where: { product: "OK", revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
    take: 2000,
  });

  let created = 0;
  for (const attempt of attempts) {
    const studentId = attempt.student.studentProfile?.id;
    const hasOk = Boolean(attempt.student.productMemberships.length);
    if (!studentId || !hasOk || !attempt.score) continue;

    const suggestions = buildCoachSuggestions(
      attempt.score.outcomeScores.map((row) => ({
        code: row.outcome.code,
        title: row.outcome.title,
        unitName: row.outcome.unit.name,
        questionCount: row.questionCount,
        correctCount: row.correctCount,
        accuracyRate: Number(row.accuracyRate),
      })),
      3,
    );
    if (!suggestions.length) continue;

    for (const suggestion of suggestions) {
      const existing = await prisma.weeklyPlanSuggestion.findFirst({
        where: {
          studentId,
          weekStart,
          kind: "MOCK_EXAM_FOLLOWUP",
          status: "PENDING",
          title: suggestion.outcomeTitle,
        },
        select: { id: true },
      });
      if (existing) continue;

      await prisma.weeklyPlanSuggestion.create({
        data: {
          studentId,
          weekStart,
          kind: "MOCK_EXAM_FOLLOWUP",
          status: "PENDING",
          title: suggestion.outcomeTitle,
          rationale: suggestion.label,
          payload: {
            source: "ODK",
            examId,
            outcomeCode: suggestion.outcomeCode,
            subject: suggestion.subject,
            topic: suggestion.topic,
            questionCount: suggestion.questionCount,
            correctCount: suggestion.correctCount,
            accuracyRate: suggestion.accuracyRate,
            cta: suggestion.cta,
          },
          createdBySystem: true,
        },
      });
      created += 1;
    }
  }

  return { created, attemptCount: attempts.length };
}
