import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/prisma";
import { getOrRefreshTeacherHomeSnapshot, getTeacherHomeSnapshot, refreshTeacherHomeSnapshot } from "../../lib/panel/teacher-home-server";
import { createIntegrationPrismaClient, integration } from "./integration-utils";
import { assertIntegrationSchemaReady } from "./integration-utils";

const db = createIntegrationPrismaClient();
const runId = crypto.randomUUID();

integration("teacher home snapshot Postgres'a yazılır ve okunur", async () => {
  await assertIntegrationSchemaReady(db);
  const now = new Date();
  const teacher = await db.user.create({
    data: {
      email: `integration-teacher-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
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
    assert.equal(snapshot.counts.flags, 1);
    assert.equal(snapshot.todayLessons[0].id, todayLesson.id);
    assert.equal(snapshot.todayLessons[0].studentCount, 1);
    assert.equal(snapshot.flags[0].reason, "Son iki haftada 2 derse katılmadı.");
  } finally {
    await db.group.delete({ where: { id: group.id } });
    await db.user.deleteMany({ where: { id: { in: [teacher.id, studentUser.id] } } });
  }
});

test.after(async () => {
  await Promise.all([db.$disconnect(), prisma.$disconnect()]);
});
