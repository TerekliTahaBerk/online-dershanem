import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  loadStudentHomeProductData,
  type StudentHomeQueries,
} from "./panel/student-home-data";

function createQueries() {
  const calls = { enrollments: 0, lessons: 0, recovery: 0, plan: 0, exams: 0 };
  const queries: StudentHomeQueries = {
    async listEnrollmentGroupIds() {
      calls.enrollments += 1;
      return ["group-1"];
    },
    async listTodayLessons() {
      calls.lessons += 1;
      return [];
    },
    async getNextRecoveryPackage() {
      calls.recovery += 1;
      return null;
    },
    async getWeeklyPlan() {
      calls.plan += 1;
      return null;
    },
    async listRecentExams() {
      calls.exams += 1;
      return [
        {
          id: "exam-1",
          title: "TYT 1",
          exam: "TYT",
          takenAt: new Date("2026-08-29T09:00:00.000Z"),
          sections: [
            { subjectName: "Türkçe", correctCount: 20, incorrectCount: 4 },
          ],
        },
      ];
    },
  };
  return { calls, queries };
}

test("ODK entitlement yoksa deneme sorgusu çalışmaz ve ODK bloğu dönmez", async () => {
  const { calls, queries } = createQueries();
  const data = await loadStudentHomeProductData({
    studentId: "student-1",
    products: ["OD", "OK"],
    now: new Date("2026-08-30T12:00:00.000Z"),
    queries,
  });

  assert.equal(calls.exams, 0);
  assert.equal(data.ODK, null);
  assert.notEqual(data.OD, null);
  assert.notEqual(data.OK, null);
});

test("ODK-only öğrenci yalnız ODK sorgusunu ve DTO bloğunu alır", async () => {
  const { calls, queries } = createQueries();
  const data = await loadStudentHomeProductData({
    studentId: "student-1",
    products: ["ODK"],
    now: new Date("2026-08-30T12:00:00.000Z"),
    queries,
  });

  assert.deepEqual(calls, { enrollments: 0, lessons: 0, recovery: 0, plan: 0, exams: 1 });
  assert.equal(data.OD, null);
  assert.equal(data.OK, null);
  assert.equal(data.ODK?.latestExam?.net, 19);
  assert.deepEqual(data.ODK?.trend.map((point) => point.net), [19]);
});

test("öğrenci ana sayfasının bugün aralığı İstanbul 00:00 sınırını kullanır", async () => {
  const { calls, queries } = createQueries();
  queries.listTodayLessons = async (_groupIds, dayStart, dayEnd) => {
    assert.equal(dayStart.toISOString(), "2026-08-29T21:00:00.000Z");
    assert.equal(dayEnd.toISOString(), "2026-08-30T21:00:00.000Z");
    return [];
  };

  await loadStudentHomeProductData({
    studentId: "student-1",
    products: ["OD"],
    now: new Date("2026-08-29T21:30:00.000Z"), // İstanbul 00:30
    queries,
  });
  assert.equal(calls.recovery, 1);
});

test("öğrenci ana sayfası ve API aynı server domain service'ini kullanır", () => {
  for (const path of ["app/panel/ogrenci/page.tsx", "app/api/panel/student/home/route.ts"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /getStudentHomeData/);
    assert.doesNotMatch(source, /prisma\.mockExam/);
  }
});

test("OD bloğu yayımlanmış telafi adayını taşır", async () => {
  const { queries } = createQueries();
  queries.getNextRecoveryPackage = async () => ({
    id: "recovery-1",
    lessonTitle: "Köklü ifadeler",
    dueAt: new Date("2026-08-31T12:00:00.000Z"),
  });
  const data = await loadStudentHomeProductData({
    studentId: "student-1",
    products: ["OD"],
    now: new Date("2026-08-30T12:00:00.000Z"),
    queries,
  });
  assert.equal(data.OD?.nextRecovery?.id, "recovery-1");
  assert.equal(data.OD?.nextRecovery?.lessonTitle, "Köklü ifadeler");
});

test("günlük AI kotaları process timezone yerine canonical İstanbul helper'ını kullanır", () => {
  for (const path of ["app/api/panel/dino/route.ts", "app/api/panel/ai-drafts/route.ts"]) {
    const source = readFileSync(path, "utf8");
    assert.match(source, /istanbulDayStart\(new Date\(\)\)/);
    assert.doesNotMatch(source, /setHours\(0,\s*0,\s*0,\s*0\)/);
  }
});
