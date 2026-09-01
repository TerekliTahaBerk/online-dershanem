import "server-only";

import { prisma } from "@/lib/prisma";
import { goalProgress, netScore, type GoalBand } from "@/lib/goals";
import { buildWeeklyKocumMetrics } from "@/lib/kocum/metrics";
import { formatIstanbulDateInput, istanbulWeekStart } from "@/lib/istanbul-time";

/**
 * ÖĞRENCİ HEDEFLERİ — okuma tarafı.
 *
 * Hedefin kendisi `StudentGoal`da saklıdır; ŞU ANKİ DEĞER her çağrıda gerçek
 * veriden hesaplanır:
 *  - `SUBJECT_NET`  → en son denemenin o ders bölümünden net,
 *  - `PLAN_COMPLETION` → son haftalık planların görev tamamlanma oranı.
 *
 * Şu anki değer hiç yoksa (o derste deneme girilmemişse) `current: null`
 * döner ve ekran ilerleme ÇİZMEZ — sıfır göstermek "hedeften çok uzaksın"
 * demek olurdu ki bu yanlış.
 */

export type GoalView = {
  id: string;
  kind:
    | "SUBJECT_NET"
    | "PLAN_COMPLETION"
    | "EXAM_TARGET"
    | "SCORE_TARGET"
    | "SUBJECT_FOCUS"
    | "WEEKLY_STUDY_MINUTES"
    | "WEEKLY_QUESTION_COUNT";
  label: string;
  target: number;
  current: number | null;
  percent: number | null;
  band: GoalBand | null;
  nearTermNote: string | null;
  /** Ölçümün dayandığı kaynak — ekranda dürüstlük için gösterilir. */
  basis: string | null;
  status: "ACTIVE" | "ACHIEVED" | "PAUSED" | "ARCHIVED";
  startsAt: string | null;
  targetAt: string | null;
  baselineValue: number | null;
};
const NUM = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 });

/** Son N haftalık planın görev tamamlanma yüzdesi. */
async function planCompletionPercent(studentId: string): Promise<{ pct: number; basis: string } | null> {
  const plans = await prisma.weeklyPlan.findMany({
    where: { studentId },
    orderBy: { weekStart: "desc" },
    take: 4,
    select: { tasks: { where: { status: { not: "SKIPPED" } }, select: { status: true } } },
  });
  const tasks = plans.flatMap((p) => p.tasks);
  if (tasks.length === 0) return null;
  const done = tasks.filter((t) => t.status === "DONE" || t.status === "PARTIAL").length;
  return {
    pct: Math.round((done / tasks.length) * 100),
    basis: `son ${plans.length} haftanın ${tasks.length} görevi`,
  };
}

export async function getStudentGoals(studentProfileId: string): Promise<GoalView[]> {
  const goals = await prisma.studentGoal.findMany({
    where: { studentId: studentProfileId, archivedAt: null },
    orderBy: [{ kind: "asc" }, { subjectName: "asc" }],
    select: {
      id: true,
      kind: true,
      subjectName: true,
      targetValue: true,
      nearTermNote: true,
      status: true,
      startsAt: true,
      targetAt: true,
      baselineValue: true,
    },
  });
  if (goals.length === 0) return [];

  const subjects = goals.map((g) => g.subjectName).filter(Boolean) as string[];

  /* Her ders için EN SON denemenin bölümü. */
  const sections = subjects.length
    ? await prisma.mockExamSection.findMany({
        where: { mockExam: { studentId: studentProfileId }, subjectName: { in: subjects } },
        orderBy: { mockExam: { takenAt: "desc" } },
        select: {
          subjectName: true,
          correctCount: true,
          incorrectCount: true,
          mockExam: { select: { takenAt: true, title: true } },
        },
      })
    : [];

  const latestBySubject = new Map<string, (typeof sections)[number]>();
  for (const section of sections) {
    if (!latestBySubject.has(section.subjectName)) latestBySubject.set(section.subjectName, section);
  }

  const needsPlanMetrics = goals.some(
    (g) =>
      g.kind === "PLAN_COMPLETION" ||
      g.kind === "WEEKLY_STUDY_MINUTES" ||
      g.kind === "WEEKLY_QUESTION_COUNT",
  );
  const planCompletion = goals.some((g) => g.kind === "PLAN_COMPLETION")
    ? await planCompletionPercent(studentProfileId)
    : null;

  let thisWeekMetrics: ReturnType<typeof buildWeeklyKocumMetrics> | null = null;
  if (needsPlanMetrics) {
    const weekStart = istanbulWeekStart(new Date());
    const plan = await prisma.weeklyPlan.findUnique({
      where: { studentId_weekStart: { studentId: studentProfileId, weekStart } },
      select: {
        tasks: {
          select: {
            id: true,
            status: true,
            scheduledFor: true,
            durationMinutes: true,
            actualMinutes: true,
            targetType: true,
            targetValue: true,
            actualQuestions: true,
            subject: true,
          },
        },
      },
    });
    if (plan) {
      thisWeekMetrics = buildWeeklyKocumMetrics(
        plan.tasks.map((t) => ({
          id: t.id,
          status: t.status,
          scheduledFor: t.scheduledFor,
          durationMinutes: t.durationMinutes,
          actualMinutes: t.actualMinutes,
          targetType: t.targetType,
          targetValue: t.targetValue,
          actualQuestions: t.actualQuestions,
          subject: t.subject,
        })),
        formatIstanbulDateInput(new Date()),
        formatIstanbulDateInput,
      );
    }
  }

  return goals.map((goal) => {
    let current: number | null = null;
    let basis: string | null = null;
    let label: string;

    if (goal.kind === "SUBJECT_NET") {
      label = `${goal.subjectName} neti ${NUM.format(goal.targetValue)}`;
      const section = latestBySubject.get(goal.subjectName ?? "");
      if (section) {
        current = netScore(section.correctCount, section.incorrectCount);
        basis = section.mockExam.title
          ? `son deneme · ${section.mockExam.title}`
          : "son deneme";
      }
    } else if (goal.kind === "PLAN_COMPLETION") {
      label = `Haftalık plan tamamlama %${NUM.format(goal.targetValue)}`;
      if (planCompletion) {
        current = planCompletion.pct;
        basis = planCompletion.basis;
      }
    } else if (goal.kind === "EXAM_TARGET") {
      label = goal.subjectName
        ? `${goal.subjectName}`
        : `Sınav hedefi ${NUM.format(goal.targetValue)}`;
      current = goal.targetValue > 0 ? null : null;
      basis = "hedef kaydı";
    } else if (goal.kind === "SCORE_TARGET") {
      label = `Puan hedefi ${NUM.format(goal.targetValue)}`;
      basis = "hedef kaydı";
    } else if (goal.kind === "SUBJECT_FOCUS") {
      label = `${goal.subjectName} odağı`;
      basis = "ders odağı";
    } else if (goal.kind === "WEEKLY_STUDY_MINUTES") {
      label = `Haftalık çalışma ${NUM.format(goal.targetValue)} dk`;
      if (thisWeekMetrics) {
        current = thisWeekMetrics.completedMinutes;
        basis = "bu haftanın gerçekleşen süresi";
      } else {
        basis = "bu hafta plan kaydı yok";
      }
    } else if (goal.kind === "WEEKLY_QUESTION_COUNT") {
      label = `Haftalık ${NUM.format(goal.targetValue)} soru`;
      if (thisWeekMetrics) {
        current = thisWeekMetrics.questionActual;
        basis = "bu haftanın çözülen soruları";
      } else {
        basis = "bu hafta plan kaydı yok";
      }
    } else {
      label = `Hedef ${NUM.format(goal.targetValue)}`;
    }

    const progress = current === null ? null : goalProgress(current, goal.targetValue);

    return {
      id: goal.id,
      kind: goal.kind,
      label,
      target: goal.targetValue,
      current,
      percent: progress?.percent ?? null,
      band: progress?.band ?? null,
      nearTermNote: goal.nearTermNote,
      basis,
      status: goal.status,
      startsAt: goal.startsAt?.toISOString() ?? null,
      targetAt: goal.targetAt?.toISOString() ?? null,
      baselineValue: goal.baselineValue,
    };
  });
}

/** Koçun hedef koyabilmesi için öğrencinin GERÇEK deneme dersleri. */
export async function getStudentExamSubjects(studentProfileId: string): Promise<string[]> {
  const rows = await prisma.mockExamSection.findMany({
    where: { mockExam: { studentId: studentProfileId } },
    select: { subjectName: true },
    distinct: ["subjectName"],
    orderBy: { subjectName: "asc" },
  });
  return rows.map((r) => r.subjectName);
}
