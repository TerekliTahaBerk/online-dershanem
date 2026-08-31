import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/prisma";
import { getOrRefreshTeacherHomeSnapshot, getTeacherHomeSnapshot, refreshTeacherHomeSnapshot } from "../../lib/panel/teacher-home-server";
import { createPrismaTeacherAttentionQueries } from "../../lib/panel/teacher-attention-server";
import { loadTeacherAttentionInbox, type TeacherAttentionQueries } from "../../lib/panel/teacher-attention";
import { createIntegrationPrismaClient, integration } from "./integration-utils";
import { assertIntegrationSchemaReady } from "./integration-utils";

const db = createIntegrationPrismaClient();
const runId = crypto.randomUUID();

function wrapQueries(base: TeacherAttentionQueries) {
  const calls = { roster: 0, help: 0, notes: 0, absences: 0, assignments: 0, interventions: 0, exams: 0 };
  const queries: TeacherAttentionQueries = {
    async listRoster(teacherId) {
      calls.roster += 1;
      return base.listRoster(teacherId);
    },
    async listOpenHelp(teacherId) {
      calls.help += 1;
      return base.listOpenHelp(teacherId);
    },
    async listPendingNotes(teacherId, now, since) {
      calls.notes += 1;
      return base.listPendingNotes(teacherId, now, since);
    },
    async countAbsences(teacherId, studentIds, since) {
      calls.absences += 1;
      return base.countAbsences(teacherId, studentIds, since);
    },
    async countOverdueAssignments(teacherId, studentIds, now) {
      calls.assignments += 1;
      return base.countOverdueAssignments(teacherId, studentIds, now);
    },
    async listOpenInterventions(teacherId) {
      calls.interventions += 1;
      return base.listOpenInterventions(teacherId);
    },
    async listRecentExams(teacherId, studentIds, since) {
      calls.exams += 1;
      return base.listRecentExams(teacherId, studentIds, since);
    },
  };
  return { calls, queries };
}

integration("teacher home snapshot Postgres'a yazılır ve okunur", async () => {
  await assertIntegrationSchemaReady(db);
  const now = new Date();
  const teacher = await db.user.create({
    data: {
      email: `integration-teacher-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Integration Teacher",
    },
  });
  const studentUser = await db.user.create({
    data: {
      email: `integration-student-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Integration Student",
    },
  });
  const student = await db.studentProfile.create({
    data: { userId: studentUser.id, classLevel: "10", weeklyGoal: "5 saat" },
  });
  const group = await db.group.create({
    data: {
      name: `10-A-${runId.slice(0, 8)}`,
      subject: "Matematik",
      teacherId: teacher.id,
      isActive: true,
    },
  });

  try {
    await db.enrollment.create({
      data: { groupId: group.id, studentId: student.id },
    });

    const todayLesson = await db.lesson.create({
      data: {
        groupId: group.id,
        teacherId: teacher.id,
        title: "Bugünün dersi",
        startsAt: now,
        endsAt: new Date(now.getTime() + 60 * 60 * 1000),
        status: "PLANNED",
      },
    });
    const missingNoteLesson = await db.lesson.create({
      data: {
        groupId: group.id,
        teacherId: teacher.id,
        title: "Eksik notlu ders",
        startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
        status: "COMPLETED",
      },
    });
    const archivedLesson = await db.lesson.create({
      data: {
        groupId: group.id,
        teacherId: teacher.id,
        title: "Arşivlenmiş ders",
        startsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
        status: "COMPLETED",
      },
    });

    await Promise.all([
      db.attendance.create({
        data: { lessonId: missingNoteLesson.id, studentId: student.id, status: "ABSENT" },
      }),
      db.attendance.create({
        data: { lessonId: archivedLesson.id, studentId: student.id, status: "ABSENT" },
      }),
      db.lessonNote.create({
        data: { lessonId: todayLesson.id, studentId: null, note: "Bugünün notu" },
      }),
      db.lessonNote.create({
        data: { lessonId: archivedLesson.id, studentId: null, note: "Toplu not" },
      }),
    ]);

    const snapshot = await refreshTeacherHomeSnapshot(teacher.id);
    const persisted = await getTeacherHomeSnapshot(teacher.id);
    const cached = await getOrRefreshTeacherHomeSnapshot(teacher.id);

    assert.ok(persisted);
    assert.deepEqual(persisted, snapshot);
    assert.deepEqual(cached, snapshot);
    assert.equal(snapshot.summary, "1 ders · 1 ders için not girişi bekliyor");
    assert.equal(snapshot.counts.todayLessons, 1);
    assert.equal(snapshot.counts.awaitingNotes, 1);
    assert.equal(snapshot.counts.flags, 0);
    assert.deepEqual(snapshot.flags, []);
    assert.equal(snapshot.todayLessons[0].id, todayLesson.id);
    assert.equal(snapshot.todayLessons[0].studentCount, 1);
  } finally {
    await db.group.delete({ where: { id: group.id } });
    await db.user.deleteMany({ where: { id: { in: [teacher.id, studentUser.id] } } });
  }
});

integration("teacher attention inbox kapsam, öncelik ve sorgu sayısını korur", async () => {
  await assertIntegrationSchemaReady(db);
  const now = new Date();
  const passwordHash = "scrypt$1$8$1$YmFzZTY0$c2hhMDA=";
  const teacher = await db.user.create({
    data: {
      email: `attention-teacher-${runId}@example.com`,
      passwordHash,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Attention Teacher",
    },
  });
  const otherTeacher = await db.user.create({
    data: {
      email: `attention-other-teacher-${runId}@example.com`,
      passwordHash,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Other Teacher",
    },
  });
  const helpUser = await db.user.create({
    data: {
      email: `attention-help-${runId}@example.com`,
      passwordHash,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Ahmet Yılmaz",
    },
  });
  const absentUser = await db.user.create({
    data: {
      email: `attention-absent-${runId}@example.com`,
      passwordHash,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Elif Kaya",
    },
  });
  const quietUser = await db.user.create({
    data: {
      email: `attention-quiet-${runId}@example.com`,
      passwordHash,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Sakin Öğrenci",
    },
  });
  const foreignUser = await db.user.create({
    data: {
      email: `attention-foreign-${runId}@example.com`,
      passwordHash,
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Yabancı Öğrenci",
    },
  });

  const helpStudent = await db.studentProfile.create({ data: { userId: helpUser.id, classLevel: "10" } });
  const absentStudent = await db.studentProfile.create({ data: { userId: absentUser.id, classLevel: "10" } });
  const quietStudent = await db.studentProfile.create({ data: { userId: quietUser.id, classLevel: "10" } });
  const foreignStudent = await db.studentProfile.create({ data: { userId: foreignUser.id, classLevel: "10" } });

  const group = await db.group.create({
    data: { name: `attention-${runId.slice(0, 8)}`, subject: "Matematik", teacherId: teacher.id, isActive: true },
  });
  const foreignGroup = await db.group.create({
    data: { name: `foreign-${runId.slice(0, 8)}`, subject: "Fen", teacherId: otherTeacher.id, isActive: true },
  });

  try {
    await db.enrollment.createMany({
      data: [
        { groupId: group.id, studentId: helpStudent.id },
        { groupId: group.id, studentId: absentStudent.id },
        { groupId: group.id, studentId: quietStudent.id },
        { groupId: foreignGroup.id, studentId: foreignStudent.id },
      ],
    });

    const lessons = await Promise.all(
      [1, 2, 3].map((offset) =>
        db.lesson.create({
          data: {
            groupId: group.id,
            teacherId: teacher.id,
            title: `Devamsızlık ${offset}`,
            startsAt: new Date(now.getTime() - offset * 24 * 60 * 60 * 1000),
            endsAt: new Date(now.getTime() - offset * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
            status: "COMPLETED",
          },
        }),
      ),
    );
    const foreignLesson = await db.lesson.create({
      data: {
        groupId: foreignGroup.id,
        teacherId: otherTeacher.id,
        title: "Yabancı ders",
        startsAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
        status: "COMPLETED",
      },
    });

    await Promise.all([
      ...lessons.map((lesson) =>
        db.attendance.create({ data: { lessonId: lesson.id, studentId: absentStudent.id, status: "ABSENT" } }),
      ),
      db.attendance.create({ data: { lessonId: foreignLesson.id, studentId: foreignStudent.id, status: "ABSENT" } }),
      db.studentCheckIn.create({
        data: {
          studentId: helpStudent.id,
          groupId: group.id,
          energy: "LOW",
          confidence: "NEED_GUIDANCE",
          barrier: "NOT_UNDERSTANDING",
          shareWithTeacher: true,
          helpRequest: {
            create: {
              studentId: helpStudent.id,
              groupId: group.id,
              dueAt: new Date(now.getTime() - 60 * 60 * 1000),
            },
          },
        },
      }),
      db.studentCheckIn.create({
        data: {
          studentId: foreignStudent.id,
          groupId: foreignGroup.id,
          energy: "LOW",
          confidence: "NEED_GUIDANCE",
          barrier: "ACCESS_TECH",
          shareWithTeacher: true,
          helpRequest: {
            create: {
              studentId: foreignStudent.id,
              groupId: foreignGroup.id,
              dueAt: new Date(now.getTime() - 60 * 60 * 1000),
            },
          },
        },
      }),
    ]);

    const emptyInbox = await loadTeacherAttentionInbox({
      teacherId: teacher.id,
      now,
      flags: { studentCheckIn: false, interventionInbox: false, mockExamAnalysis: false },
      queries: createPrismaTeacherAttentionQueries(),
    });
    assert.ok(emptyInbox.rows.some((row) => row.source === "ATTENDANCE" && row.studentName === "Elif Kaya"));
    assert.equal(emptyInbox.rows.some((row) => row.source === "HELP_REQUEST"), false);

    const { calls, queries } = wrapQueries(createPrismaTeacherAttentionQueries());
    const inbox = await loadTeacherAttentionInbox({
      teacherId: teacher.id,
      now,
      flags: { studentCheckIn: true, interventionInbox: true, mockExamAnalysis: true },
      queries,
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
    assert.equal(inbox.rows[0].source, "HELP_REQUEST");
    assert.equal(inbox.rows[0].studentName, "Ahmet Yılmaz");
    assert.equal(inbox.rows[0].severity, "overdue");
    assert.ok(inbox.rows.some((row) => row.source === "ATTENDANCE" && row.studentName === "Elif Kaya"));
    assert.equal(inbox.rows.some((row) => row.studentName === "Yabancı Öğrenci"), false);
    assert.equal(inbox.rows.some((row) => row.studentName === "Sakin Öğrenci"), false);
    assert.equal(inbox.quietStudentCount, 1);

    const otherInbox = await loadTeacherAttentionInbox({
      teacherId: otherTeacher.id,
      now,
      flags: { studentCheckIn: true, interventionInbox: true, mockExamAnalysis: true },
      queries: createPrismaTeacherAttentionQueries(),
    });
    assert.equal(otherInbox.rows.some((row) => row.studentName === "Ahmet Yılmaz"), false);
    assert.equal(otherInbox.rows.some((row) => row.studentName === "Yabancı Öğrenci"), true);
  } finally {
    await db.group.deleteMany({ where: { id: { in: [group.id, foreignGroup.id] } } });
    await db.user.deleteMany({
      where: {
        id: {
          in: [teacher.id, otherTeacher.id, helpUser.id, absentUser.id, quietUser.id, foreignUser.id],
        },
      },
    });
  }
});

test.after(async () => {
  await Promise.all([db.$disconnect(), prisma.$disconnect()]);
});
