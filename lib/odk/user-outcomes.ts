import { prisma } from "@/lib/prisma";

/**
 * Tek bir kullanıcının ODK kazanım/ders/konu/deneme bazlı analizi.
 *
 * Bu modül FAZ 7 ile eklendi. Sadece ilgili `userId`'ye ait SUBMITTED
 * attempt'lerden agregeler üretir. Global rapor için bkz.
 * `app/panel/admin/odk/kazanim/page.tsx`.
 */

export type OutcomeAgg = {
  lesson: string;
  unit: string | null;
  topic: string | null;
  code: string;
  outcome: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

export type TopicAgg = {
  lesson: string;
  topic: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
};

export type LessonAgg = {
  lesson: string;
  total: number;
  correct: number;
  wrong: number;
  blank: number;
  attemptCount: number;
};

export type AttemptProgress = {
  attemptId: string;
  examTitle: string;
  submittedAt: Date | null;
  correct: number;
  wrong: number;
  blank: number;
  net: number; // correct - wrong/4 (TYT/AYT konvansiyonu)
  scorePct: number;
};

export type UserOutcomeReport = {
  totalAttempts: number;
  totalQuestions: number;
  totalCorrect: number;
  totalWrong: number;
  totalBlank: number;
  byLesson: LessonAgg[];
  byTopic: TopicAgg[];
  byOutcome: OutcomeAgg[];
  weakOutcomes: (OutcomeAgg & { errorRate: number })[];
  strongOutcomes: (OutcomeAgg & { successRate: number })[];
  progress: AttemptProgress[];
};

const MIN_TRIES = 2; // tek kullanıcı için kazanım gösterim eşiği

export async function getUserOutcomeReport(userId: string): Promise<UserOutcomeReport> {
  const attempts = await prisma.odkExamAttempt.findMany({
    where: { userId, status: "SUBMITTED" },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      examId: true,
      submittedAt: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      exam: { select: { title: true } },
      opticalAnswers: {
        select: { sectionId: true, questionNumber: true, selectedOption: true },
      },
    },
  });

  if (attempts.length === 0) {
    return {
      totalAttempts: 0,
      totalQuestions: 0,
      totalCorrect: 0,
      totalWrong: 0,
      totalBlank: 0,
      byLesson: [],
      byTopic: [],
      byOutcome: [],
      weakOutcomes: [],
      strongOutcomes: [],
      progress: [],
    };
  }

  const sectionIds = Array.from(
    new Set(attempts.flatMap((a) => a.opticalAnswers.map((o) => o.sectionId))),
  );
  const officials = sectionIds.length
    ? await prisma.odkExamOfficialAnswer.findMany({
        where: { sectionId: { in: sectionIds } },
        select: {
          sectionId: true,
          questionNumber: true,
          correctOption: true,
          lesson: true,
          unit: true,
          topic: true,
          learningOutcomeCode: true,
          learningOutcome: true,
        },
      })
    : [];

  type OffMeta = {
    correct: string;
    lesson: string | null;
    unit: string | null;
    topic: string | null;
    code: string | null;
    outcome: string | null;
  };
  const offMap = new Map<string, OffMeta>();
  for (const o of officials) {
    offMap.set(`${o.sectionId}:${o.questionNumber}`, {
      correct: o.correctOption,
      lesson: o.lesson,
      unit: o.unit,
      topic: o.topic,
      code: o.learningOutcomeCode,
      outcome: o.learningOutcome,
    });
  }

  const byOutcomeMap = new Map<string, OutcomeAgg>();
  const byTopicMap = new Map<string, TopicAgg>();
  const byLessonMap = new Map<string, LessonAgg>();
  const progress: AttemptProgress[] = [];

  let totalQuestions = 0;
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalBlank = 0;

  for (const a of attempts) {
    const totalQ = a.correctCount + a.wrongCount + a.blankCount;
    const net = a.correctCount - a.wrongCount / 4;
    const scorePct = totalQ > 0 ? (a.correctCount / totalQ) * 100 : 0;
    progress.push({
      attemptId: a.id,
      examTitle: a.exam.title,
      submittedAt: a.submittedAt,
      correct: a.correctCount,
      wrong: a.wrongCount,
      blank: a.blankCount,
      net,
      scorePct,
    });

    for (const ans of a.opticalAnswers) {
      const off = offMap.get(`${ans.sectionId}:${ans.questionNumber}`);
      if (!off) continue;
      totalQuestions += 1;
      const isBlank = !ans.selectedOption;
      const isCorrect = !isBlank && ans.selectedOption === off.correct;
      const isWrong = !isBlank && !isCorrect;
      if (isCorrect) totalCorrect += 1;
      else if (isWrong) totalWrong += 1;
      else totalBlank += 1;

      const lesson = off.lesson ?? "—";

      // Lesson agg
      {
        const cur = byLessonMap.get(lesson) ?? {
          lesson,
          total: 0,
          correct: 0,
          wrong: 0,
          blank: 0,
          attemptCount: 0,
        };
        cur.total += 1;
        if (isCorrect) cur.correct += 1;
        else if (isWrong) cur.wrong += 1;
        else cur.blank += 1;
        byLessonMap.set(lesson, cur);
      }

      // Topic agg
      if (off.topic) {
        const tkey = `${lesson}::${off.topic}`;
        const cur = byTopicMap.get(tkey) ?? {
          lesson,
          topic: off.topic,
          total: 0,
          correct: 0,
          wrong: 0,
          blank: 0,
        };
        cur.total += 1;
        if (isCorrect) cur.correct += 1;
        else if (isWrong) cur.wrong += 1;
        else cur.blank += 1;
        byTopicMap.set(tkey, cur);
      }

      // Outcome agg
      if (off.code) {
        const okey = `${lesson}::${off.code}`;
        const cur = byOutcomeMap.get(okey) ?? {
          lesson,
          unit: off.unit,
          topic: off.topic,
          code: off.code,
          outcome: off.outcome ?? "",
          total: 0,
          correct: 0,
          wrong: 0,
          blank: 0,
        };
        cur.total += 1;
        if (isCorrect) cur.correct += 1;
        else if (isWrong) cur.wrong += 1;
        else cur.blank += 1;
        byOutcomeMap.set(okey, cur);
      }
    }
  }

  // Lesson attemptCount: kaç farklı attempt o derste soru çözmüş
  const lessonAttemptSets = new Map<string, Set<string>>();
  for (const a of attempts) {
    for (const ans of a.opticalAnswers) {
      const off = offMap.get(`${ans.sectionId}:${ans.questionNumber}`);
      if (!off) continue;
      const lesson = off.lesson ?? "—";
      if (!lessonAttemptSets.has(lesson)) lessonAttemptSets.set(lesson, new Set());
      lessonAttemptSets.get(lesson)!.add(a.id);
    }
  }
  for (const [lesson, set] of lessonAttemptSets) {
    const cur = byLessonMap.get(lesson);
    if (cur) cur.attemptCount = set.size;
  }

  const byOutcome = Array.from(byOutcomeMap.values());
  const eligible = byOutcome.filter((r) => r.total >= MIN_TRIES);

  const weakOutcomes = eligible
    .map((r) => ({ ...r, errorRate: (r.wrong + r.blank) / r.total }))
    .sort((a, b) => b.errorRate - a.errorRate)
    .slice(0, 15);

  const strongOutcomes = eligible
    .map((r) => ({ ...r, successRate: r.correct / r.total }))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 15);

  return {
    totalAttempts: attempts.length,
    totalQuestions,
    totalCorrect,
    totalWrong,
    totalBlank,
    byLesson: Array.from(byLessonMap.values()).sort((a, b) => b.total - a.total),
    byTopic: Array.from(byTopicMap.values()).sort((a, b) => b.total - a.total),
    byOutcome: byOutcome.sort((a, b) => b.total - a.total),
    weakOutcomes,
    strongOutcomes,
    progress,
  };
}
