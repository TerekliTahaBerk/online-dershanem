import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/prisma";
import {
  GroupLifecycleError,
  ensureActiveGroup,
  transferStudentBetweenGroups,
} from "../../lib/panel/group-lifecycle";
import {
  LessonLifecycleError,
  assertLessonNoConflict,
  resolveScopedLessons,
} from "../../lib/panel/lesson-lifecycle";
import { createIntegrationPrismaClient, integration } from "./integration-utils";

const db = createIntegrationPrismaClient();
const runId = crypto.randomUUID();

integration("grup transferi kapasiteyi canonical kaynaktan doğrular", async () => {
  const now = new Date();
  const teacher = await db.user.create({
    data: {
      email: `lifecycle-teacher-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Lifecycle Teacher",
    },
  });

  const studentUsers = await Promise.all(
    ["a", "b", "c"].map((suffix) =>
      db.user.create({
        data: {
          email: `lifecycle-student-${suffix}-${runId}@example.com`,
          passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
          mustChangePassword: false,
          inviteAcceptedAt: now,
          role: "STUDENT",
          status: "ACTIVE",
          fullName: `Student ${suffix.toUpperCase()}`,
        },
      }),
    ),
  );
  const students = await Promise.all(studentUsers.map((user) => db.studentProfile.create({ data: { userId: user.id } })));
  const source = await db.group.create({ data: { name: `Source-${runId.slice(0, 8)}`, subject: "Matematik", teacherId: teacher.id, capacity: 2, isActive: true } });
  const target = await db.group.create({ data: { name: `Target-${runId.slice(0, 8)}`, subject: "Matematik", teacherId: teacher.id, capacity: 1, isActive: true } });

  try {
    await db.enrollment.createMany({
      data: [
        { groupId: source.id, studentId: students[0].id },
        { groupId: source.id, studentId: students[1].id },
        { groupId: target.id, studentId: students[2].id },
      ],
    });

    await assert.rejects(
      async () =>
        db.$transaction(async (tx) => {
          const targetGroup = await ensureActiveGroup(tx, target.id);
          await transferStudentBetweenGroups(tx, source.id, targetGroup, students[0].id);
        }),
      (error: unknown) => error instanceof GroupLifecycleError && error.code === "GROUP_CAPACITY_FULL",
    );

    await db.enrollment.update({
      where: { groupId_studentId: { groupId: target.id, studentId: students[2].id } },
      data: { endedAt: new Date() },
    });

    await db.$transaction(async (tx) => {
      const targetGroup = await ensureActiveGroup(tx, target.id);
      await transferStudentBetweenGroups(tx, source.id, targetGroup, students[0].id);
    });

    const [sourceEnrollment, targetEnrollment] = await Promise.all([
      db.enrollment.findUnique({ where: { groupId_studentId: { groupId: source.id, studentId: students[0].id } } }),
      db.enrollment.findUnique({ where: { groupId_studentId: { groupId: target.id, studentId: students[0].id } } }),
    ]);
    assert.ok(sourceEnrollment?.endedAt);
    assert.equal(targetEnrollment?.endedAt, null);
  } finally {
    await db.group.deleteMany({ where: { id: { in: [source.id, target.id] } } });
    await db.user.deleteMany({ where: { id: { in: [teacher.id, ...studentUsers.map((user) => user.id)] } } });
  }
});

integration("ders serisi kapsamı ve çakışma kontrolü çalışır", async () => {
  const now = new Date();
  const teacher = await db.user.create({
    data: {
      email: `series-teacher-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Series Teacher",
    },
  });
  const group = await db.group.create({ data: { name: `Series-${runId.slice(0, 8)}`, subject: "Fen", teacherId: teacher.id, isActive: true } });
  const series = await db.lessonSeries.create({ data: { groupId: group.id, teacherId: teacher.id, title: "Haftalık Fen" } });

  try {
    const anchor = new Date("2026-09-01T10:00:00.000Z");
    const lessons = await Promise.all(
      [0, 7, 14].map((day) =>
        db.lesson.create({
          data: {
            groupId: group.id,
            seriesId: series.id,
            teacherId: teacher.id,
            title: "Fen",
            startsAt: new Date(anchor.getTime() + day * 24 * 60 * 60 * 1000),
            endsAt: new Date(anchor.getTime() + day * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
            status: "PLANNED",
          },
        }),
      ),
    );

    await db.lesson.create({
      data: {
        groupId: group.id,
        teacherId: teacher.id,
        title: "Çakışan ders",
        startsAt: new Date("2026-09-08T11:30:00.000Z"),
        endsAt: new Date("2026-09-08T12:30:00.000Z"),
        status: "PLANNED",
      },
    });

    const scoped = await db.$transaction((tx) => resolveScopedLessons(tx, lessons[1].id, "FOLLOWING"));
    assert.equal(scoped.length, 2);

    await assert.rejects(
      async () =>
        db.$transaction((tx) =>
          assertLessonNoConflict(tx, {
            lessonId: lessons[1].id,
            teacherId: teacher.id,
            groupId: group.id,
            startsAt: new Date("2026-09-08T11:00:00.000Z"),
            endsAt: new Date("2026-09-08T12:00:00.000Z"),
          }),
        ),
      (error: unknown) => error instanceof LessonLifecycleError && error.code === "SCHEDULE_CONFLICT",
    );
  } finally {
    await db.group.delete({ where: { id: group.id } });
    await db.user.delete({ where: { id: teacher.id } });
  }
});

test.after(async () => {
  await Promise.all([db.$disconnect(), prisma.$disconnect()]);
});
