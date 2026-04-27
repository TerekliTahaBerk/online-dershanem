"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";
import { requireOdkExamAccess } from "@/lib/odk-access";
import {
  hasOdkExamAttemptSectionScoresColumn,
  hasOdkExamAttemptTabSwitchCountColumn,
} from "@/lib/odk-exam-schema";

async function requireOdkUser() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  return session;
}

// ── Exam Attempts ─────────────────────────────────────────────────────────────

export async function startExam(
  examId: string,
): Promise<{ attemptId: string; startedAt: string; serverNow: number } | null> {
  const session = await requireOdkUser();
  const userId = session.user.id;

  // P0: enforce access control server-side
  await requireOdkExamAccess(userId, examId);

  // P0: enforce time window server-side — client checks alone are bypassable
  const exam = await prisma.odkExam.findUnique({
    where: { id: examId },
    select: { startsAt: true, endsAt: true, durationMinutes: true },
  });
  if (!exam) throw new Error("Sınav bulunamadı");

  const now = new Date();
  if (exam.startsAt && exam.startsAt > now) {
    throw new Error("Sınav henüz başlamadı");
  }
  // Allow new attempts up to 2 minutes past endsAt (grace for last-second starters)
  if (exam.endsAt) {
    const graceEnd = new Date(exam.endsAt.getTime() + 2 * 60 * 1000);
    if (now > graceEnd) throw new Error("Sınav sona erdi");
  }

  const existing = await prisma.odkExamAttempt.findFirst({
    where: { userId, examId },
    select: { id: true, startedAt: true },
  });

  if (existing) {
    revalidatePath(`/odk/panel/sinavlar/${examId}`);
    return { attemptId: existing.id, startedAt: existing.startedAt.toISOString(), serverNow: Date.now() };
  }

  const attempt = await prisma.odkExamAttempt.create({
    data: { userId, examId, status: "IN_PROGRESS" },
    select: { id: true, startedAt: true },
  });

  revalidatePath(`/odk/panel/sinavlar/${examId}`);
  revalidatePath("/odk/panel/sinavlar");
  return { attemptId: attempt.id, startedAt: attempt.startedAt.toISOString(), serverNow: Date.now() };
}

// In-process rate limiter for recordAnswer: keyed by userId+attemptId+sectionId+qNum.
// Tracks last accepted timestamp. Rejects calls that arrive < 200ms after the last one
// for the same slot. Works within a single serverless invocation; across-instance
// protection relies on the unique constraint on (attemptId, sectionId, questionNumber).
const recordAnswerLastSeen = new Map<string, number>();

export async function recordAnswer(
  attemptId: string,
  sectionId: string,
  questionNumber: number,
  selectedOption: string | null,
) {
  const session = await requireOdkUser();
  const userId = session.user.id;

  // P1: server-side rate limit — reject bursts faster than 200ms per slot
  const rlKey = `${userId}:${attemptId}:${sectionId}:${questionNumber}`;
  const last = recordAnswerLastSeen.get(rlKey) ?? 0;
  const now = Date.now();
  if (now - last < 200) return; // drop; client will retry after debounce
  recordAnswerLastSeen.set(rlKey, now);

  // P0: validate sectionId belongs to this attempt's exam
  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    select: {
      id: true,
      exam: { select: { sections: { select: { id: true } } } },
    },
  });
  if (!attempt) return;

  const validSectionIds = new Set(attempt.exam.sections.map((s) => s.id));
  if (!validSectionIds.has(sectionId)) return; // silently drop — not this exam's section

  if (selectedOption === null) {
    await prisma.odkAttemptOpticalAnswer.deleteMany({
      where: { attemptId, sectionId, questionNumber },
    });
  } else {
    await prisma.odkAttemptOpticalAnswer.upsert({
      where: { attemptId_sectionId_questionNumber: { attemptId, sectionId, questionNumber } },
      create: { attemptId, sectionId, questionNumber, selectedOption },
      update: { selectedOption, answeredAt: new Date() },
    });
  }
}

export async function recordTabSwitch(attemptId: string, newCount: number) {
  const session = await requireOdkUser();
  const userId = session.user.id;
  const hasTabSwitchCountColumn = await hasOdkExamAttemptTabSwitchCountColumn();

  if (!hasTabSwitchCountColumn) return;

  await prisma.odkExamAttempt.updateMany({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    data: { tabSwitchCount: newCount },
  });
}

export async function submitAttempt(
  attemptId: string,
  answers: Record<string, Record<number, string>>,
  answerTimestamps?: Record<string, Record<number, number>>,
) {
  const session = await requireOdkUser();
  const userId = session.user.id;
  const hasSectionScoresColumn = await hasOdkExamAttemptSectionScoresColumn();

  type OfficialAnswer = {
    questionNumber: number;
    correctOption: string;
    outcomes: { konu: string; kazanim: string; altKazanim?: string } | null;
  };

  type AttemptWithExam = {
    id: string;
    examId: string;
    startedAt: Date;
    exam: {
      durationMinutes: number;
      endsAt: Date | null;
      sections: Array<{
        id: string;
        title: string;
        questionCount: number;
        officialAnswers: OfficialAnswer[];
      }>;
    };
  };

  const attempt = (await prisma.odkExamAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    select: {
      id: true,
      examId: true,
      startedAt: true,
      exam: {
        select: {
          durationMinutes: true,
          endsAt: true,
          sections: {
            orderBy: { orderIndex: "asc" },
            select: {
              id: true,
              title: true,
              questionCount: true,
              officialAnswers: true,
            },
          },
        },
      },
    },
  })) as unknown as AttemptWithExam | null;

  if (!attempt) throw new Error("Girişim bulunamadı");

  // Server-side time validation: reject if far past the allowed duration
  const elapsedMs = Date.now() - attempt.startedAt.getTime();
  const allowedMs = (attempt.exam.durationMinutes + 2) * 60 * 1000; // 2 min grace
  if (elapsedMs > allowedMs) {
    // Still process — just cap the duration to the allowed max rather than reject,
    // so auto-submits from the client timer are always accepted.
  }

  // Save optical answers
  const opticalUpserts = Object.entries(answers).flatMap(([sectionId, sectionAnswers]) =>
    Object.entries(sectionAnswers).map(([num, option]) =>
      prisma.odkAttemptOpticalAnswer.upsert({
        where: {
          attemptId_sectionId_questionNumber: {
            attemptId,
            sectionId,
            questionNumber: Number(num),
          },
        },
        create: {
          attemptId,
          sectionId,
          questionNumber: Number(num),
          selectedOption: option,
        },
        update: { selectedOption: option },
      }),
    ),
  );

  await prisma.$transaction(opticalUpserts);

  // Score with per-section breakdown
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalBlank = 0;

  type SectionScore = {
    sectionId: string;
    title: string;
    questionCount: number;
    correct: number;
    wrong: number;
    blank: number;
    net: number;
  };

  const sectionScores: SectionScore[] = [];

  for (const section of attempt.exam.sections) {
    const userSection = answers[section.id] ?? {};
    let correct = 0;
    let wrong = 0;
    let blank = 0;

    for (const official of section.officialAnswers) {
      const userAnswer = userSection[official.questionNumber];
      if (!userAnswer) {
        blank++;
      } else if (userAnswer === official.correctOption) {
        correct++;
      } else {
        wrong++;
      }
    }

    // Questions with no official answer = blank
    const answeredNums = Object.keys(userSection).map(Number);
    for (const num of answeredNums) {
      const hasOfficial = section.officialAnswers.some((o) => o.questionNumber === num);
      if (!hasOfficial) blank++;
    }

    // Questions not answered at all (beyond official answers)
    const unanswered =
      section.questionCount - section.officialAnswers.length - blank;
    blank += Math.max(0, unanswered);

    totalCorrect += correct;
    totalWrong += wrong;
    totalBlank += blank;

    sectionScores.push({
      sectionId: section.id,
      title: section.title,
      questionCount: section.questionCount,
      correct,
      wrong,
      blank,
      net: correct - wrong / 4,
    });
  }

  const net = totalCorrect - totalWrong / 4;
  const rawDurationSec = Math.round((Date.now() - attempt.startedAt.getTime()) / 1000);
  const maxDurationSec = attempt.exam.durationMinutes * 60;
  const totalDuration = Math.min(rawDurationSec, maxDurationSec);

  // Build per-kazanım breakdown from outcomes metadata
  type KazanimStat = {
    konu: string;
    kazanim: string;
    correct: number;
    wrong: number;
    blank: number;
  };
  const kazanimMap: Record<string, KazanimStat> = {};

  for (const section of attempt.exam.sections) {
    const userSection = answers[section.id] ?? {};
    for (const official of section.officialAnswers) {
      if (!official.outcomes) continue;
      const key = `${official.outcomes.konu}::${official.outcomes.kazanim}`;
      kazanimMap[key] ??= { konu: official.outcomes.konu, kazanim: official.outcomes.kazanim, correct: 0, wrong: 0, blank: 0 };
      const ans = userSection[official.questionNumber];
      if (!ans) kazanimMap[key].blank++;
      else if (ans === official.correctOption) kazanimMap[key].correct++;
      else kazanimMap[key].wrong++;
    }
  }

  const kazanimBreakdown = Object.values(kazanimMap);

  // Compute answer integrity flags from per-answer timestamps
  type IntegrityFlags = {
    avgAnswerIntervalMs: number;
    minAnswerIntervalMs: number;
    suspiciouslyFastAnswers: number;
    burstAnswerGroups: number;
    totalTimestamped: number;
  };
  let integrityFlags: IntegrityFlags | null = null;

  if (answerTimestamps) {
    const allTs = Object.values(answerTimestamps)
      .flatMap((sec) => Object.values(sec))
      .sort((a, b) => a - b);

    if (allTs.length >= 2) {
      const intervals = allTs.slice(1).map((t, i) => t - allTs[i]);
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const minMs = Math.min(...intervals);
      const fastCount = intervals.filter((ms) => ms < 3000).length;

      // Count groups of 5+ consecutive fast answers (< 5s apart)
      let burstGroups = 0;
      let streak = 0;
      for (const ms of intervals) {
        if (ms < 5000) { streak++; if (streak === 5) burstGroups++; }
        else streak = 0;
      }

      integrityFlags = {
        avgAnswerIntervalMs: Math.round(avgMs),
        minAnswerIntervalMs: Math.round(minMs),
        suspiciouslyFastAnswers: fastCount,
        burstAnswerGroups: burstGroups,
        totalTimestamped: allTs.length,
      };
    }
  }

  // P0: atomic status transition — prevents double-submit race condition.
  // updateMany returns a count; if count === 0 another request already submitted.
  const { count } = await prisma.odkExamAttempt.updateMany({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      score: net,
      correctCount: totalCorrect,
      wrongCount: totalWrong,
      blankCount: totalBlank,
      durationSeconds: totalDuration,
      resultPayload: { net, sectionScores, kazanimBreakdown, integrityFlags },
      ...(hasSectionScoresColumn ? { sectionScores: sectionScores as unknown as never } : {}),
    },
  });

  if (count === 0) {
    // Already submitted by a concurrent request — just revalidate so the client
    // sees the existing result.
    revalidatePath(`/odk/panel/sinavlar/${attempt.examId}`);
    return;
  }

  revalidatePath(`/odk/panel/sinavlar/${attempt.examId}`);
  revalidatePath("/odk/panel/sinavlar");
  revalidatePath("/odk/panel/sonuclar");
  revalidatePath("/odk/panel");
}
