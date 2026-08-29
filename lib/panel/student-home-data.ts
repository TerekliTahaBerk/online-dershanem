import type { ProductCode } from "@prisma/client";
import { netScore } from "@/lib/goals";
import { istanbulDayStart, istanbulNextDayStart } from "@/lib/istanbul-time";

type LessonRow = {
  id: string;
  startsAt: Date;
  title: string;
  teacherName: string | null;
  groupName: string;
};

type PlanTaskRow = {
  id: string;
  title: string;
  durationMinutes: number;
  scheduledFor: Date;
  status: string;
};

type ExamRow = {
  id: string;
  title: string | null;
  exam: string;
  takenAt: Date;
  sections: Array<{
    subjectName: string;
    correctCount: number;
    incorrectCount: number;
  }>;
};

export type StudentHomeProductData = {
  OD: { todayLessons: LessonRow[] } | null;
  OK: {
    weeklyPlan: {
      done: number;
      total: number;
      tasks: Array<PlanTaskRow & { done: boolean }>;
    } | null;
    todayTasks: PlanTaskRow[];
  } | null;
  ODK: {
    latestExam: {
      id: string;
      title: string;
      takenAt: Date;
      net: number;
      delta: number | null;
      sections: Array<{
        name: string;
        correct: number;
        incorrect: number;
        net: number;
      }>;
    } | null;
    trend: Array<{ takenAt: Date; net: number }>;
  } | null;
};

export type StudentHomeQueries = {
  listEnrollmentGroupIds(studentId: string): Promise<string[]>;
  listTodayLessons(groupIds: string[], dayStart: Date, dayEnd: Date): Promise<LessonRow[]>;
  getWeeklyPlan(studentId: string): Promise<{ tasks: PlanTaskRow[] } | null>;
  listRecentExams(studentId: string): Promise<ExamRow[]>;
};

function examNet(sections: ExamRow["sections"]): number {
  return sections.reduce(
    (sum, section) => sum + netScore(section.correctCount, section.incorrectCount),
    0,
  );
}

/** Her ürün sorgusu yalnız ilgili entitlement varsa başlatılır. */
export async function loadStudentHomeProductData(input: {
  studentId: string;
  products: readonly ProductCode[];
  now: Date;
  queries: StudentHomeQueries;
}): Promise<StudentHomeProductData> {
  const dayStart = istanbulDayStart(input.now);
  const dayEnd = istanbulNextDayStart(input.now);

  const odPromise = input.products.includes("OD")
    ? (async () => {
        const groupIds = await input.queries.listEnrollmentGroupIds(input.studentId);
        const todayLessons = groupIds.length
          ? await input.queries.listTodayLessons(groupIds, dayStart, dayEnd)
          : [];
        return { todayLessons };
      })()
    : Promise.resolve(null);

  const okPromise = input.products.includes("OK")
    ? input.queries.getWeeklyPlan(input.studentId).then((plan) => {
        const tasks = plan?.tasks ?? [];
        return {
          weeklyPlan: plan
            ? {
                done: tasks.filter((task) => task.status === "DONE").length,
                total: tasks.length,
                tasks: tasks.slice(0, 3).map((task) => ({
                  ...task,
                  done: task.status === "DONE",
                })),
              }
            : null,
          todayTasks: tasks.filter(
            (task) => task.scheduledFor >= dayStart && task.scheduledFor < dayEnd,
          ),
        };
      })
    : Promise.resolve(null);

  const odkPromise = input.products.includes("ODK")
    ? input.queries.listRecentExams(input.studentId).then((exams) => {
        const latest = exams[0] ?? null;
        const previous = exams[1] ?? null;
        const latestNet = latest ? examNet(latest.sections) : null;
        return {
          latestExam:
            latest && latestNet !== null
              ? {
                  id: latest.id,
                  title: latest.title || latest.exam,
                  takenAt: latest.takenAt,
                  net: latestNet,
                  delta: previous ? latestNet - examNet(previous.sections) : null,
                  sections: latest.sections.map((section) => ({
                    name: section.subjectName,
                    correct: section.correctCount,
                    incorrect: section.incorrectCount,
                    net: netScore(section.correctCount, section.incorrectCount),
                  })),
                }
              : null,
          trend: [...exams]
            .reverse()
            .map((exam) => ({
              takenAt: exam.takenAt,
              net: Number(examNet(exam.sections).toFixed(2)),
            })),
        };
      })
    : Promise.resolve(null);

  const [OD, OK, ODK] = await Promise.all([odPromise, okPromise, odkPromise]);
  return { OD, OK, ODK };
}
