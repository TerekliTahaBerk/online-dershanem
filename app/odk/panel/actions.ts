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

export async function startExam(examId: string) {
  const session = await requireOdkUser();
  const userId = session.user.id;

  // Check for existing attempt
  const existing = await prisma.odkExamAttempt.findFirst({
    where: { userId, examId },
  });

  if (existing) {
    redirect(`/odk/panel/sinavlar/${examId}`);
  }

  await prisma.odkExamAttempt.create({
    data: { userId, examId, status: "IN_PROGRESS" },
  });

  revalidatePath(`/odk/panel/sinavlar/${examId}`);
  revalidatePath("/odk/panel/sinavlar");
}

export async function submitAttempt(
  attemptId: string,
  answers: Record<string, Record<number, string>>, // sectionId → { qNum → option }
) {
  const session = await requireOdkUser();
  const userId = session.user.id;

  const attempt = await prisma.odkExamAttempt.findFirst({
    where: { id: attemptId, userId, status: "IN_PROGRESS" },
    include: {
      exam: {
        include: {
          sections: {
            include: { officialAnswers: true },
          },
        },
      },
    },
  });

  if (!attempt) throw new Error("Girişim bulunamadı");

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

  // Score against official answers
  let correct = 0;
  let wrong = 0;
  let blank = 0;

  for (const section of attempt.exam.sections) {
    const userSection = answers[section.id] ?? {};
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
    // Questions with no official answer are counted as blank
    const answeredNums = Object.keys(userSection).map(Number);
    for (const num of answeredNums) {
      const hasOfficial = section.officialAnswers.some(
        (o) => o.questionNumber === num,
      );
      if (!hasOfficial) blank++;
    }
  }

  // Net = correct - wrong/4
  const net = correct - wrong / 4;

  const totalDuration = Math.round(
    (Date.now() - attempt.startedAt.getTime()) / 1000,
  );

  await prisma.odkExamAttempt.update({
    where: { id: attemptId },
    data: {
      status: "SUBMITTED",
      submittedAt: new Date(),
      score: net,
      correctCount: correct,
      wrongCount: wrong,
      blankCount: blank,
      durationSeconds: totalDuration,
    },
  });

  revalidatePath(`/odk/panel/sinavlar/${attempt.examId}`);
  revalidatePath("/odk/panel/sinavlar");
  revalidatePath("/odk/panel/sonuclar");
  revalidatePath("/odk/panel");
}
