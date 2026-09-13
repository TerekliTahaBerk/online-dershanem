import type { OdkExamStatus, ProductCode } from "@prisma/client";
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
  sourceType?: "ASSIGNMENT" | "REVIEW" | "WEAK_OUTCOME" | "EXAM_PREP" | "RECOVERY" | "MANUAL_COACH" | "MOCK_EXAM" | "SYSTEM_SUGGESTED" | "TEMPLATE" | "PERSONAL_GOAL";
  sourceReferenceId?: string | null;
  reasonCode: "DUE_SOON" | "REVIEW_DUE" | "NEEDS_REVIEW" | "EXAM_APPROACHING" | "CAPACITY_BALANCE" | "MISSED_LESSON";
};

type OdkExamSignalRow = {
  id: string;
  title: string;
  status: OdkExamStatus;
  startsAt: Date | null;
  endsAt: Date | null;
  hasActiveAttempt: boolean;
};

type ReviewQueueRow = {
  id: string;
  title: string;
  dueAt: Date;
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
  OD: {
    todayLessons: LessonRow[];
    nextRecovery: { id: string; lessonId: string; lessonTitle: string; dueAt: Date } | null;
  } | null;
  OK: {
    weeklyPlan: {
      done: number;
      total: number;
      tasks: Array<PlanTaskRow & { done: boolean }>;
    } | null;
    todayTasks: PlanTaskRow[];
    overdueTasks: PlanTaskRow[];
  } | null;
  ODK: {
    activeAttempt: OdkExamSignalRow | null;
    upcomingExam: OdkExamSignalRow | null;
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
  SHARED: {
    dueReview: ReviewQueueRow | null;
  } | null;
};

export type StudentHomeQueries = {
  listEnrollmentGroupIds(studentId: string): Promise<string[]>;
  listTodayLessons(groupIds: string[], dayStart: Date, dayEnd: Date): Promise<LessonRow[]>;
  getNextRecoveryPackage(studentId: string): Promise<{ id: string; lessonId: string; lessonTitle: string; dueAt: Date } | null>;
  getWeeklyPlan(studentId: string): Promise<{ tasks: PlanTaskRow[] } | null>;
  listRecentExams(studentId: string): Promise<ExamRow[]>;
  listOdkExamSignals(studentUserId: string): Promise<OdkExamSignalRow[]>;
  getDueReview(studentId: string, now: Date): Promise<ReviewQueueRow | null>;
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
  studentUserId: string;
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
        const nextRecovery = await input.queries.getNextRecoveryPackage(input.studentId);
        return { todayLessons, nextRecovery };
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
            (task) =>
              task.status === "PLANNED" &&
              task.scheduledFor >= dayStart &&
              task.scheduledFor < dayEnd,
          ),
          overdueTasks: tasks.filter(
            (task) => task.status === "PLANNED" && task.scheduledFor < dayStart,
          ),
        };
      })
    : Promise.resolve(null);

  const odkPromise = input.products.includes("ODK")
    ? Promise.all([
        input.queries.listRecentExams(input.studentId),
        input.queries.listOdkExamSignals(input.studentUserId),
      ]).then(([exams, examSignals]) => {
        const latest = exams[0] ?? null;
        const previous = exams[1] ?? null;
        const latestNet = latest ? examNet(latest.sections) : null;
        const activeAttempt = examSignals.find((exam) => exam.hasActiveAttempt) ?? null;
        const upcomingExam =
          examSignals.find((exam) => !exam.hasActiveAttempt && (!exam.endsAt || exam.endsAt > input.now)) ??
          null;
        return {
          activeAttempt,
          upcomingExam,
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

  const sharedPromise = input.products.includes("OD")
    ? input.queries.getDueReview(input.studentId, input.now).then((dueReview) => ({
        dueReview,
      }))
    : Promise.resolve(null);

  const [OD, OK, ODK, SHARED] = await Promise.all([
    odPromise,
    okPromise,
    odkPromise,
    sharedPromise,
  ]);
  return { OD, OK, ODK, SHARED };
}
