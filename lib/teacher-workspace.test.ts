import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildTeacherWorkspace,
  deriveLessonPrepStatus,
  TEACHER_WORKSPACE_MAX_RISK,
} from "./panel/teacher-workspace";
import {
  buildTeacherRosterRows,
  filterTeacherRosterRows,
  parseTeacherRosterFilter,
  visibleTeacherRosterFilters,
} from "./panel/teacher-roster";

test("boş günde workspace sade özet üretir", () => {
  const workspace = buildTeacherWorkspace({
    now: new Date("2026-09-01T09:00:00.000Z"),
    todayLessons: [],
    pending: [],
    riskyStudents: [],
    upcoming: [],
  });
  assert.equal(workspace.summary, "Bugün planlanmış iş yok.");
  assert.equal(workspace.todayLessons.length, 0);
  assert.equal(workspace.pending.length, 0);
});

test("günlük ders hazırlık durumunu ve tipini türetir", () => {
  const now = new Date("2026-09-01T12:00:00.000Z");
  assert.equal(
    deriveLessonPrepStatus({
      status: "PLANNED",
      startsAt: new Date("2026-09-01T10:00:00.000Z"),
      hasGroupNote: false,
      materialCount: 0,
      now,
    }),
    "needs_close",
  );

  const workspace = buildTeacherWorkspace({
    now,
    todayLessons: [
      {
        id: "lesson-1",
        startsAt: new Date("2026-09-01T14:00:00.000Z"),
        endsAt: new Date("2026-09-01T15:00:00.000Z"),
        title: "Matematik",
        status: "PLANNED",
        meetingUrl: "https://meet.example/1",
        groupId: "g1",
        groupName: "10-A",
        subject: "Matematik",
        studentIds: ["s1", "s2", "s3", "s4"],
        hasGroupNote: false,
        materialCount: 2,
      },
      {
        id: "lesson-2",
        startsAt: new Date("2026-09-01T16:00:00.000Z"),
        endsAt: new Date("2026-09-01T16:45:00.000Z"),
        title: "Birebir",
        status: "PLANNED",
        meetingUrl: null,
        groupId: "g2",
        groupName: "Ayşe",
        subject: "Fizik",
        studentIds: ["s1"],
        hasGroupNote: false,
        materialCount: 0,
      },
    ],
    pending: [],
    riskyStudents: [],
    upcoming: [],
  });

  assert.equal(workspace.todayLessons[0].lessonType, "GROUP");
  assert.equal(workspace.todayLessons[0].prepStatus, "ready");
  assert.equal(workspace.todayLessons[1].lessonType, "ONE_TO_ONE");
  assert.equal(workspace.todayLessons[1].primaryStudentId, "s1");
  assert.equal(workspace.todayLessons[1].prepStatus, "needs_prep");
});

test("yardım talebi bekleyen işlerde önceliklidir ve risk listesi sınırlıdır", () => {
  const now = new Date("2026-09-01T09:00:00.000Z");
  const risky = Array.from({ length: 12 }, (_, index) => ({
    studentId: `s${index}`,
    studentName: `Öğrenci ${index}`,
    groupName: "10-A",
    whyRisky: "Devamsızlık",
    lastSignalAt: now,
    lastSignalLabel: "az önce",
    score: 10 + index,
  }));

  const workspace = buildTeacherWorkspace({
    now,
    todayLessons: [],
    pending: [
      {
        kind: "LESSON_CLOSE",
        id: "lesson-1",
        title: "Kapanış",
        detail: "Not bekliyor",
        href: "/panel/ogretmen/ders/lesson-1",
        ctaLabel: "Hızlı kapat",
        dueAt: now,
        createdAt: now,
      },
      {
        kind: "HELP_REQUEST",
        id: "help-1",
        title: "Ayşe",
        detail: "Konuyu anlamadım",
        href: "/panel/ogretmen/yardim#yardim-help-1",
        ctaLabel: "Yanıtla",
        dueAt: now,
        createdAt: now,
      },
    ],
    riskyStudents: risky,
    upcoming: [],
  });

  assert.equal(workspace.pending[0].kind, "HELP_REQUEST");
  assert.equal(workspace.riskyStudents.length, TEACHER_WORKSPACE_MAX_RISK);
  assert.equal(workspace.riskyStudents[0].studentId, "s11");
});

test("roster filtreleri feature flag'e göre sadeleşir", () => {
  assert.deepEqual(
    visibleTeacherRosterFilters({
      adaptivePlan: false,
      mockExamAnalysis: false,
      studentCheckIn: false,
    }),
    ["all", "risky", "overdue", "upcoming_meeting"],
  );
  assert.ok(
    visibleTeacherRosterFilters({
      adaptivePlan: true,
      mockExamAnalysis: true,
      studentCheckIn: true,
    }).includes("help"),
  );
  assert.ok(
    visibleTeacherRosterFilters({
      adaptivePlan: true,
      mockExamAnalysis: true,
      studentCheckIn: true,
    }).includes("plan_behind"),
  );
});

test("roster satırları risk, plan ve filtre etiketlerini üretir", () => {
  const rows = buildTeacherRosterRows(
    [
      {
        studentId: "s1",
        name: "Ayşe",
        groupName: "10-A",
        lastLessonAt: new Date("2026-08-30T10:00:00.000Z"),
        lastLessonTitle: "Matematik",
        absenceCount14d: 3,
        overdueAssignmentCount: 2,
        openHelpCount: 1,
        planStatus: "APPROVED",
        planCompletionPercent: 20,
        planTaskTotal: 5,
        examDelta: 5,
        nextLessonAt: new Date("2026-09-02T10:00:00.000Z"),
      },
    ],
    { adaptivePlan: true, mockExamAnalysis: true, studentCheckIn: true },
  );

  assert.equal(rows[0].riskLevel, "high");
  assert.ok(rows[0].tags.includes("help"));
  assert.ok(rows[0].tags.includes("overdue"));
  assert.ok(rows[0].tags.includes("plan_behind"));
  assert.equal(filterTeacherRosterRows(rows, "help").length, 1);
  assert.equal(filterTeacherRosterRows(rows, "risky").length, 1);
  assert.equal(parseTeacherRosterFilter("plan_behind"), "plan_behind");
  assert.equal(parseTeacherRosterFilter("unknown"), "all");
});

test("öğretmen ana sayfası ve öğrenci listesi workspace/roster sunucusunu kullanır", () => {
  const home = readFileSync("app/panel/ogretmen/page.tsx", "utf8");
  const list = readFileSync("app/panel/ogretmen/gruplar/page.tsx", "utf8");
  assert.match(home, /getTeacherWorkspace/);
  assert.match(home, /TeacherWorkspaceHome/);
  assert.match(list, /getTeacherRoster/);
  assert.match(list, /filtre/);
});
