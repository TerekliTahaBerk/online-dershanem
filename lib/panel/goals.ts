import "server-only";

import { prisma } from "@/lib/prisma";
import { goalProgress, netScore, type GoalBand } from "@/lib/goals";

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
  kind: "SUBJECT_NET" | "PLAN_COMPLETION";
  label: string;
  target: number;
  current: number | null;
  percent: number | null;
  band: GoalBand | null;
  nearTermNote: string | null;
  /** Ölçümün dayandığı kaynak — ekranda dürüstlük için gösterilir. */
  basis: string | null;
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
  const done = tasks.filter((t) => t.status === "DONE").length;
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

  const planCompletion = goals.some((g) => g.kind === "PLAN_COMPLETION")
    ? await planCompletionPercent(studentProfileId)
    : null;

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
    } else {
      label = `Haftalık plan tamamlama %${NUM.format(goal.targetValue)}`;
      if (planCompletion) {
        current = planCompletion.pct;
        basis = planCompletion.basis;
      }
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
