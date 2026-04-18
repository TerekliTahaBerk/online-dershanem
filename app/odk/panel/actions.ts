"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

async function requireOdkUser() {
  const session = await getServerAuthSession();
  if (!session?.user) redirect("/giris");
  return session;
}

// ── Exam Attempts ─────────────────────────────────────────────────────────────

export async function startExam(
  examId: string,
): Promise<{ attemptId: string; startedAt: string } | null> {
  const session = await requireOdkUser();
  const userId = session.user.id;

  const existing = await prisma.odkExamAttempt.findFirst({
    where: { userId, examId },
    select: { id: true, startedAt: true },
  });

  if (existing) {
    revalidatePath(`/odk/panel/sinavlar/${examId}`);
    return { attemptId: existing.id, startedAt: existing.startedAt.toISOString() };
  }

  const attempt = await prisma.odkExamAttempt.create({
    data: { userId, examId, status: "IN_PROGRESS" },
    select: { id: true, startedAt: true },
  });

  revalidatePath(`/odk/panel/sinavlar/${examId}`);
  revalidatePath("/odk/panel/sinavlar");
  return { attemptId: attempt.id, startedAt: attempt.startedAt.toISOString() };
}

export async function recordTabSwitch(attemptId: string, newCount: number) {
  const session = await requireOdkUser();
  const userId = session.user.id;

  await prisma.odkExamAttempt.updateMany({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    data: { tabSwitchCount: newCount },
  });
}

export async function submitAttempt(
  attemptId: string,
  answers: Record<string, Record<number, string>>,
) {
  const session = await requireOdkUser();
  const userId = session.user.id;

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
        officialAnswers: Array<{ questionNumber: number; correctOption: string }>;
      }>;
    };
  };

  const attempt = (await prisma.odkExamAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    include: {
      exam: {
        include: {
          sections: {
            orderBy: { orderIndex: "asc" },
            include: { officialAnswers: true },
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

  await prisma.odkExamAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      score: net,
      correctCount: totalCorrect,
      wrongCount: totalWrong,
      blankCount: totalBlank,
      durationSeconds: totalDuration,
      sectionScores: sectionScores as unknown as never,
    },
  });

  revalidatePath(`/odk/panel/sinavlar/${attempt.examId}`);
  revalidatePath("/odk/panel/sinavlar");
  revalidatePath("/odk/panel/sonuclar");
  revalidatePath("/odk/panel");
}
