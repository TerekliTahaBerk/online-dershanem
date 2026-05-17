/**
 * FAZ 8 — ODK Analytics aggregator.
 *
 * Admin ODK dashboard için ağır query'ler. Cache'siz, çağıran yerde
 * cache stratejisi seç (Next.js revalidate, Redis vs.).
 *
 * Tüm sorgular SUBMITTED attempt'lere odaklanır; performans için
 * tek bir time-window'da sınırlanır (default 30 gün).
 */

import { prisma } from "@/lib/prisma";
import { cacheWrap } from "@/lib/cache";
import { clampPct, fillDailyBuckets } from "./core";

export type ExamCompletion = {
  examId: string;
  title: string | null;
  attempts: number;
  completed: number;
  completionRate: number;
  avgScore: number | null;
  avgNet: number | null;
  hardness: number; // 100 - avgScore (yüksek = zor)
};

export type ProblemOutcome = {
  code: string;
  outcome: string;
  lesson: string;
  total: number;
  wrong: number;
  errorRate: number;
};

export type CheatHeatCell = {
  examId: string;
  examTitle: string;
  total: number;
  violations: number;
  ratePct: number;
};

export type OdkAdminAnalytics = {
  windowDays: number;
  totalAttempts: number;
  totalCompleted: number;
  completionRatePct: number;
  avgNet: number | null;
  attemptsByDay: Array<{ iso: string; count: number }>;
  examCompletion: ExamCompletion[];
  hardestExams: ExamCompletion[];
  problematicOutcomes: ProblemOutcome[];
  cheatHeat: CheatHeatCell[];
};

/** Cached public API. Round 3: 60s TTL (Upstash veya in-memory). */
export async function getOdkAdminAnalytics(windowDays = 30): Promise<OdkAdminAnalytics> {
  return cacheWrap(
    `analytics:odk:${windowDays}`,
    60,
    () => computeOdkAdminAnalytics(windowDays),
  );
}

async function computeOdkAdminAnalytics(windowDays = 30): Promise<OdkAdminAnalytics> {
  const since = new Date(Date.now() - windowDays * 86400000);

  const [attempts, completedAgg, examGroups, problemOutcomes, cheatGroups] = await Promise.all([
    prisma.odkExamAttempt.findMany({
      where: { startedAt: { gte: since } },
      select: { id: true, status: true, score: true, correctCount: true, wrongCount: true, blankCount: true, examId: true, submittedAt: true, startedAt: true, cheatViolationCount: true },
    }),
    prisma.odkExamAttempt.aggregate({
      _avg: { score: true, correctCount: true, wrongCount: true },
      where: { submittedAt: { gte: since }, status: "SUBMITTED" },
    }),
    prisma.odkExamAttempt.groupBy({
      by: ["examId"],
      where: { startedAt: { gte: since } },
      _count: { _all: true },
      _avg: { score: true, correctCount: true, wrongCount: true },
    }),
    // En problemli kazanımlar: section→officialAnswers join + opticalAnswers join.
    // Performans için: son `windowDays`'teki SUBMITTED attempt'lerden,
    // optical answers + offcial join'ini in-memory yap.
    prisma.odkExamAttempt.findMany({
      where: { status: "SUBMITTED", submittedAt: { gte: since } },
      select: {
        id: true,
        opticalAnswers: { select: { sectionId: true, questionNumber: true, selectedOption: true } },
      },
      take: 500, // hard cap — performans guard
    }),
    prisma.odkExamAttempt.groupBy({
      by: ["examId"],
      where: { startedAt: { gte: since } },
      _sum: { cheatViolationCount: true },
      _count: { _all: true },
    }),
  ]);

  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter((a) => a.status === "SUBMITTED");
  const totalCompleted = completedAttempts.length;
  const completionRatePct = clampPct((totalCompleted / Math.max(1, totalAttempts)) * 100);

  // Day buckets
  const attemptsByDay = fillDailyBuckets(
    attempts,
    Math.min(windowDays, 60),
    (a) => (a.submittedAt ?? a.startedAt).toISOString().slice(0, 10),
  );

  // Exam metadata
  const examIds = Array.from(new Set(examGroups.map((g) => g.examId)));
  const examMeta = examIds.length
    ? await prisma.odkExam.findMany({
        where: { id: { in: examIds } },
        select: { id: true, title: true },
      })
    : [];
  const examMetaMap = new Map(examMeta.map((e) => [e.id, e]));

  const examCompletion: ExamCompletion[] = examGroups.map((g) => {
    const m = examMetaMap.get(g.examId);
    const total = g._count._all;
    const completed = attempts.filter((a) => a.examId === g.examId && a.status === "SUBMITTED").length;
    const avgScore = g._avg.score !== null ? Number(g._avg.score) : null;
    const avgCorrect = g._avg.correctCount !== null ? Number(g._avg.correctCount) : null;
    const avgWrong = g._avg.wrongCount !== null ? Number(g._avg.wrongCount) : 0;
    const avgNet = avgCorrect !== null ? avgCorrect - avgWrong / 4 : null;
    return {
      examId: g.examId,
      title: m?.title ?? null,
      attempts: total,
      completed,
      completionRate: clampPct((completed / Math.max(1, total)) * 100),
      avgScore,
      avgNet: avgNet !== null ? Math.round(avgNet * 100) / 100 : null,
      hardness: avgScore !== null ? Math.round(100 - avgScore) : 0,
    };
  });

  const hardestExams = examCompletion
    .filter((e) => e.completed >= 3)
    .sort((a, b) => b.hardness - a.hardness)
    .slice(0, 5);

  // Cheat heat: top 8 by violationCount
  const cheatHeat: CheatHeatCell[] = cheatGroups
    .map((g) => {
      const m = examMetaMap.get(g.examId);
      const total = g._count._all;
      const violations = g._sum.cheatViolationCount ?? 0;
      return {
        examId: g.examId,
        examTitle: m?.title ?? g.examId,
        total,
        violations,
        ratePct: total > 0 ? clampPct((violations / total) * 100) : 0,
      };
    })
    .filter((c) => c.violations > 0)
    .sort((a, b) => b.violations - a.violations)
    .slice(0, 8);

  // Problem outcomes: tüm SUBMITTED attempt'lerin opticalAnswers + officialAnswers join
  const allSections = new Set<string>();
  for (const a of problemOutcomes) {
    for (const op of a.opticalAnswers) allSections.add(op.sectionId);
  }
  let problematicOutcomes: ProblemOutcome[] = [];
  if (allSections.size > 0) {
    const officialAnswers = await prisma.odkExamOfficialAnswer.findMany({
      where: { sectionId: { in: Array.from(allSections) } },
      select: { sectionId: true, questionNumber: true, correctOption: true, lesson: true, learningOutcomeCode: true, learningOutcome: true },
    });
    const offMap = new Map<string, typeof officialAnswers[number]>();
    for (const o of officialAnswers) offMap.set(`${o.sectionId}:${o.questionNumber}`, o);

    type Agg = { code: string; outcome: string; lesson: string; total: number; wrong: number };
    const aggMap = new Map<string, Agg>();
    for (const a of problemOutcomes) {
      for (const op of a.opticalAnswers) {
        const k = `${op.sectionId}:${op.questionNumber}`;
        const off = offMap.get(k);
        if (!off || !off.learningOutcomeCode) continue;
        const key = off.learningOutcomeCode;
        const cur = aggMap.get(key) ?? {
          code: off.learningOutcomeCode,
          outcome: off.learningOutcome ?? off.learningOutcomeCode,
          lesson: off.lesson ?? "—",
          total: 0,
          wrong: 0,
        };
        cur.total++;
        if (op.selectedOption && op.selectedOption !== off.correctOption) cur.wrong++;
        aggMap.set(key, cur);
      }
    }
    problematicOutcomes = Array.from(aggMap.values())
      .filter((a) => a.total >= 5)
      .map((a) => ({ ...a, errorRate: clampPct((a.wrong / a.total) * 100) }))
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 10);
  }

  const avgNet = completedAgg._avg.correctCount !== null
    ? Number(completedAgg._avg.correctCount) - (completedAgg._avg.wrongCount !== null ? Number(completedAgg._avg.wrongCount) : 0) / 4
    : null;

  return {
    windowDays,
    totalAttempts,
    totalCompleted,
    completionRatePct,
    avgNet: avgNet !== null ? Math.round(avgNet * 100) / 100 : null,
    attemptsByDay,
    examCompletion,
    hardestExams,
    problematicOutcomes,
    cheatHeat,
  };
}
