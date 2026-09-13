import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ATTENTION_ABSENT_THRESHOLD,
  buildTeacherAttentionInbox,
  loadTeacherAttentionInbox,
  type TeacherAttentionQueries,
  type TeacherAttentionSourceData,
} from "./panel/teacher-attention";

const now = new Date("2026-08-30T12:00:00.000Z");

function source(overrides: Partial<TeacherAttentionSourceData> = {}): TeacherAttentionSourceData {
  return {
    now,
    roster: [
      { id: "student-ahmet", name: "Ahmet Yılmaz", groupName: "10-A" },
      { id: "student-elif", name: "Elif Kaya", groupName: "10-A" },
      { id: "student-quiet", name: "Sakin Öğrenci", groupName: "10-B" },
    ],
    helpRequests: [],
    pendingNotes: [],
    attendanceAbsentCounts: [],
    assignmentOverdueCounts: [],
    interventions: [],
    exams: [],
    ...overrides,
  };
}

function queries(overrides: Partial<TeacherAttentionQueries> = {}) {
  const calls = {
    roster: 0,
    help: 0,
    notes: 0,
    absences: 0,
    assignments: 0,
    interventions: 0,
    exams: 0,
  };
  const impl: TeacherAttentionQueries = {
    async listRoster() {
      calls.roster += 1;
      return [
        { id: "student-ahmet", name: "Ahmet Yılmaz", groupName: "10-A" },
        { id: "student-elif", name: "Elif Kaya", groupName: "10-A" },
      ];
    },
    async listOpenHelp() {
      calls.help += 1;
      return [];
    },
    async listPendingNotes() {
      calls.notes += 1;
      return [];
    },
    async countAbsences() {
      calls.absences += 1;
      return [];
    },
    async countOverdueAssignments() {
      calls.assignments += 1;
      return [];
    },
    async listOpenInterventions() {
      calls.interventions += 1;
      return [];
    },
    async listRecentExams() {
      calls.exams += 1;
      return [];
    },
    ...overrides,
  };
  return { calls, queries: impl };
}

test("açık yardım isteği algoritmik riskten önce gelir", () => {
  const inbox = buildTeacherAttentionInbox(
    source({
      helpRequests: [
        {
          id: "help-1",
          studentId: "student-ahmet",
          groupName: "10-A",
          barrier: "NOT_UNDERSTANDING",
          createdAt: new Date("2026-08-30T09:00:00.000Z"),
          dueAt: new Date("2026-08-31T09:00:00.000Z"),
        },
      ],
      attendanceAbsentCounts: [{ studentId: "student-elif", count: 3 }],
    }),
  );

  assert.equal(inbox.rows[0].studentName, "Ahmet Yılmaz");
  assert.equal(inbox.rows[0].source, "HELP_REQUEST");
  assert.equal(inbox.rows[0].priority, "P0");
  assert.equal(inbox.rows[0].cta.label, "Yanıtla");
  assert.equal(inbox.rows[0].reason, "Bir konuyu anlamıyorum");
  assert.match(inbox.rows[0].headline, /Yardım istedi/);
  assert.equal(inbox.rows[1].studentName, "Elif Kaya");
  assert.equal(inbox.rows[1].source, "ATTENDANCE");
});

test("süresi geçmiş yardım yeni yardımdan önce gelir", () => {
  const inbox = buildTeacherAttentionInbox(
    source({
      helpRequests: [
        {
          id: "help-new",
          studentId: "student-elif",
          groupName: "10-A",
          barrier: "NEED_EXAMPLE",
          createdAt: new Date("2026-08-30T10:00:00.000Z"),
          dueAt: new Date("2026-08-31T10:00:00.000Z"),
        },
        {
          id: "help-overdue",
          studentId: "student-ahmet",
          groupName: "10-A",
          barrier: "NOT_UNDERSTANDING",
          createdAt: new Date("2026-08-28T09:00:00.000Z"),
          dueAt: new Date("2026-08-29T09:00:00.000Z"),
        },
      ],
    }),
  );

  assert.equal(inbox.rows[0].id, "help:help-overdue");
  assert.equal(inbox.rows[0].severity, "overdue");
  assert.equal(inbox.rows[1].id, "help:help-new");
});

test("başka öğretmenin öğrencisi roster dışında kaldığı için görünmez", () => {
  const inbox = buildTeacherAttentionInbox(
    source({
      helpRequests: [
        {
          id: "foreign-help",
          studentId: "other-teacher-student",
          groupName: "Yabancı grup",
          barrier: "OTHER",
          createdAt: new Date("2026-08-30T09:00:00.000Z"),
          dueAt: new Date("2026-08-31T09:00:00.000Z"),
        },
      ],
      attendanceAbsentCounts: [{ studentId: "other-teacher-student", count: 8 }],
    }),
  );

  assert.equal(inbox.rows.length, 0);
  assert.equal(inbox.quietStudentCount, 3);
});

test("devamsızlık eşiği altında kalan öğrenci kartı üretilmez", () => {
  const inbox = buildTeacherAttentionInbox(
    source({
      attendanceAbsentCounts: [
        { studentId: "student-elif", count: ATTENTION_ABSENT_THRESHOLD },
        { studentId: "student-ahmet", count: ATTENTION_ABSENT_THRESHOLD - 1 },
      ],
    }),
  );

  assert.equal(inbox.rows.length, 1);
  assert.equal(inbox.rows[0].studentName, "Elif Kaya");
  assert.match(inbox.rows[0].headline, /Son 14 günde 3 devamsızlık/);
  assert.equal(inbox.quietStudentCount, 2);
});

test("sinyal yoksa sakin durum öğrenci sayısını taşır", () => {
  const inbox = buildTeacherAttentionInbox(source());
  assert.deepEqual(inbox.rows, []);
  assert.equal(inbox.scopedStudentCount, 3);
  assert.equal(inbox.quietStudentCount, 3);
});

test("sağlıklı öğrenciler için kart üretilmez; yardım aynı öğrencide P2'yi ezer", () => {
  const inbox = buildTeacherAttentionInbox(
    source({
      helpRequests: [
        {
          id: "help-1",
          studentId: "student-ahmet",
          groupName: "10-A",
          barrier: "TIME_LOAD",
          createdAt: new Date("2026-08-30T09:00:00.000Z"),
          dueAt: new Date("2026-08-31T09:00:00.000Z"),
        },
      ],
      attendanceAbsentCounts: [{ studentId: "student-ahmet", count: 4 }],
      assignmentOverdueCounts: [{ studentId: "student-quiet", count: 1 }],
    }),
  );

  assert.equal(inbox.rows.length, 1);
  assert.equal(inbox.rows[0].source, "HELP_REQUEST");
  assert.equal(inbox.quietStudentCount, 2);
});

test("deneme net düşüşü gerçek ölçümden P2 satırı üretir", () => {
  const inbox = buildTeacherAttentionInbox(
    source({
      exams: [
        {
          studentId: "student-elif",
          takenAt: new Date("2026-08-20T09:00:00.000Z"),
          sections: [{ correctCount: 30, incorrectCount: 4 }],
        },
        {
          studentId: "student-elif",
          takenAt: new Date("2026-08-28T09:00:00.000Z"),
          sections: [{ correctCount: 18, incorrectCount: 8 }],
        },
      ],
    }),
  );

  assert.equal(inbox.rows.length, 1);
  assert.equal(inbox.rows[0].source, "EXAM");
  assert.match(inbox.rows[0].reason, /net/);
});

test("öğrenci sayısı artsa da her sorgu en fazla bir kez çalışır", async () => {
  const { calls, queries: q } = queries();
  const inbox = await loadTeacherAttentionInbox({
    teacherId: "teacher-1",
    now,
    flags: { studentCheckIn: true, interventionInbox: true, mockExamAnalysis: true },
    queries: q,
  });

  assert.deepEqual(calls, {
    roster: 1,
    help: 1,
    notes: 0,
    absences: 1,
    assignments: 1,
    interventions: 1,
    exams: 1,
  });
  assert.equal(inbox.quietStudentCount, 2);
});

test("özellik kapalıysa yardım ve deneme sorgusu çalışmaz", async () => {
  const { calls, queries: q } = queries();
  await loadTeacherAttentionInbox({
    teacherId: "teacher-1",
    now,
    flags: { studentCheckIn: false, interventionInbox: false, mockExamAnalysis: false },
    queries: q,
  });

  assert.equal(calls.help, 0);
  assert.equal(calls.notes, 0);
  assert.equal(calls.interventions, 0);
  assert.equal(calls.exams, 0);
  assert.equal(calls.absences, 1);
});

test("attention listesi üstten 8 kayıtla sınırlanır", () => {
  const inbox = buildTeacherAttentionInbox({
    ...source({
      roster: Array.from({ length: 12 }, (_, i) => ({
        id: `student-${i}`,
        name: `Öğrenci ${i}`,
        groupName: "10-A",
      })),
      attendanceAbsentCounts: Array.from({ length: 12 }, (_, i) => ({
        studentId: `student-${i}`,
        count: ATTENTION_ABSENT_THRESHOLD + 1,
      })),
    }),
    helpRequests: [],
    assignmentOverdueCounts: [],
    interventions: [],
    exams: [],
  });

  assert.equal(inbox.rows.length, 8);
  assert.equal(inbox.totalRowCount, 12);
  assert.equal(inbox.hiddenRowCount, 4);
});

test("öğretmen ana sayfası attention read-model'ini kullanır ve deneme iddiasını uydurmaz", () => {
  const source = readFileSync("app/panel/ogretmen/page.tsx", "utf8");
  assert.match(source, /getTeacherWorkspace/);
  assert.doesNotMatch(source, /Sıralama ödev, katılım ve deneme verisinden çıkar/);
  assert.doesNotMatch(source, /attendance\.findMany/);
});

test("sunucu sorguları öğretmen kimliğiyle sınırlanır", () => {
  const source = readFileSync("lib/panel/teacher-attention-server.ts", "utf8");
  assert.match(source, /group: \{ teacherId, isActive: true \}/);
  assert.match(source, /lesson: \{ teacherId \}/);
  assert.match(source, /groupBy/);
  assert.doesNotMatch(source, /findFirst/);
});
