import assert from "node:assert/strict";
import test from "node:test";
import type { StudentHomeProductData } from "./panel/student-home-data";
import { buildStudentHomeActionPlan } from "./panel/student-home-actions";

function emptyData(): StudentHomeProductData {
  return { OD: null, OK: null, ODK: null, SHARED: null };
}

test("active ODK attempt, today's tasktan önce gelir", () => {
  const plan = buildStudentHomeActionPlan({
    now: new Date("2026-08-30T12:00:00.000Z"),
    products: ["OK", "ODK"],
    productData: {
      ...emptyData(),
      OK: {
        weeklyPlan: null,
        todayTasks: [
          {
            id: "task-1",
            title: "Paragraf çalış",
            durationMinutes: 25,
            scheduledFor: new Date("2026-08-30T16:00:00.000Z"),
            status: "PLANNED",
            reasonCode: "DUE_SOON",
          },
        ],
        overdueTasks: [],
      },
      ODK: {
        activeAttempt: {
          id: "exam-1",
          title: "TYT Matematik",
          status: "LIVE",
          startsAt: new Date("2026-08-30T11:40:00.000Z"),
          endsAt: new Date("2026-08-30T13:40:00.000Z"),
          hasActiveAttempt: true,
        },
        upcomingExam: null,
        latestExam: null,
        trend: [],
      },
    },
  });
  assert.equal(plan.nowAction?.actionKind, "RESUME_ODK_ATTEMPT");
});

test("çok yakında başlayan canlı ders, eski overdue plan görevini ezer", () => {
  const plan = buildStudentHomeActionPlan({
    now: new Date("2026-08-30T12:00:00.000Z"),
    products: ["OD", "OK"],
    productData: {
      ...emptyData(),
      OD: {
        todayLessons: [
          {
            id: "lesson-1",
            title: "Problemler",
            startsAt: new Date("2026-08-30T12:20:00.000Z"),
            teacherName: "Öğretmen",
            groupName: "8-A",
          },
        ],
        nextRecovery: null,
      },
      OK: {
        weeklyPlan: null,
        todayTasks: [],
        overdueTasks: [
          {
            id: "task-1",
            title: "Eski görev",
            durationMinutes: 20,
            scheduledFor: new Date("2026-08-28T08:00:00.000Z"),
            status: "PLANNED",
            reasonCode: "DUE_SOON",
          },
        ],
      },
    },
  });
  assert.equal(plan.nowAction?.actionKind, "OPEN_LESSON");
});

test("overdue plan görevi, bugünkü plan görevinden önce gelir", () => {
  const plan = buildStudentHomeActionPlan({
    now: new Date("2026-08-30T12:00:00.000Z"),
    products: ["OK"],
    productData: {
      ...emptyData(),
      OK: {
        weeklyPlan: null,
        todayTasks: [
          {
            id: "today-task",
            title: "Bugünkü görev",
            durationMinutes: 20,
            scheduledFor: new Date("2026-08-30T18:00:00.000Z"),
            status: "PLANNED",
            reasonCode: "DUE_SOON",
          },
        ],
        overdueTasks: [
          {
            id: "old-task",
            title: "Dünden kalan",
            durationMinutes: 20,
            scheduledFor: new Date("2026-08-29T08:00:00.000Z"),
            status: "PLANNED",
            reasonCode: "DUE_SOON",
          },
        ],
      },
    },
  });
  assert.equal(plan.nowAction?.id, "task-overdue-old-task");
});

test("aynı sınav için active attempt + upcoming exam tek aksiyona düşer", () => {
  const plan = buildStudentHomeActionPlan({
    now: new Date("2026-08-30T12:00:00.000Z"),
    products: ["ODK"],
    productData: {
      ...emptyData(),
      ODK: {
        activeAttempt: {
          id: "exam-1",
          title: "Aynı deneme",
          status: "LIVE",
          startsAt: new Date("2026-08-30T11:00:00.000Z"),
          endsAt: new Date("2026-08-30T13:00:00.000Z"),
          hasActiveAttempt: true,
        },
        upcomingExam: {
          id: "exam-1",
          title: "Aynı deneme",
          status: "LIVE",
          startsAt: new Date("2026-08-30T11:00:00.000Z"),
          endsAt: new Date("2026-08-30T13:00:00.000Z"),
          hasActiveAttempt: true,
        },
        latestExam: null,
        trend: [],
      },
    },
  });
  assert.equal(plan.allActions.length, 1);
  assert.equal(plan.nowAction?.actionKind, "RESUME_ODK_ATTEMPT");
});

test("aday yoksa şimdi aksiyonu boş döner", () => {
  const plan = buildStudentHomeActionPlan({
    now: new Date("2026-08-30T12:00:00.000Z"),
    products: ["OD", "OK", "ODK"],
    productData: emptyData(),
  });
  assert.equal(plan.nowAction, null);
  assert.equal(plan.nextActions.length, 0);
});

test("tek aday varsa yalnız şimdi dolu olur", () => {
  const plan = buildStudentHomeActionPlan({
    now: new Date("2026-08-30T12:00:00.000Z"),
    products: ["OD"],
    productData: {
      ...emptyData(),
      OD: {
        todayLessons: [
          {
            id: "lesson-1",
            title: "Cebir",
            startsAt: new Date("2026-08-30T15:00:00.000Z"),
            teacherName: "Öğretmen",
            groupName: "8-A",
          },
        ],
        nextRecovery: null,
      },
    },
  });
  assert.equal(plan.nowAction?.id, "lesson-lesson-1");
  assert.equal(plan.nextActions.length, 0);
});

test("çok adayda yüzeye yalnız şimdi + iki sonra gelir", () => {
  const todayTasks = Array.from({ length: 10 }).map((_, index) => ({
    id: `task-${index}`,
    title: `Görev ${index}`,
    durationMinutes: 20,
    scheduledFor: new Date(`2026-08-30T1${index % 10}:00:00.000Z`),
    status: "PLANNED",
    reasonCode: "DUE_SOON" as const,
  }));
  const plan = buildStudentHomeActionPlan({
    now: new Date("2026-08-30T09:00:00.000Z"),
    products: ["OK"],
    productData: {
      ...emptyData(),
      OK: {
        weeklyPlan: null,
        todayTasks,
        overdueTasks: [],
      },
    },
  });
  assert.equal(plan.allActions.length, 10);
  assert.equal(plan.nextActions.length, 2);
});
