import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../lib/prisma";
import {
  GROUP_MUTATION_ISOLATION,
  GroupLifecycleError,
  ensureActiveGroup,
  previewStudentTransfer,
  transferStudentBetweenGroups,
  transferStudentsBetweenGroups,
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
        db.$transaction(
          async (tx) => {
            const targetGroup = await ensureActiveGroup(tx, target.id);
            await transferStudentBetweenGroups(tx, source.id, targetGroup, students[0].id);
          },
          { isolationLevel: GROUP_MUTATION_ISOLATION },
        ),
      (error: unknown) => error instanceof GroupLifecycleError && error.code === "GROUP_CAPACITY_FULL",
    );

    await db.enrollment.update({
      where: { groupId_studentId: { groupId: target.id, studentId: students[2].id } },
      data: { endedAt: new Date() },
    });

    await db.$transaction(
      async (tx) => {
        const targetGroup = await ensureActiveGroup(tx, target.id);
        await transferStudentBetweenGroups(tx, source.id, targetGroup, students[0].id);
      },
      { isolationLevel: GROUP_MUTATION_ISOLATION },
    );

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

integration("transfer önizleme öğrenci çakışmasını engeller", async () => {
  const now = new Date();
  const teacherA = await db.user.create({
    data: {
      email: `conflict-teacher-a-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Teacher A",
    },
  });
  const teacherB = await db.user.create({
    data: {
      email: `conflict-teacher-b-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Teacher B",
    },
  });
  const studentUser = await db.user.create({
    data: {
      email: `conflict-student-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Conflict Student",
    },
  });
  const student = await db.studentProfile.create({ data: { userId: studentUser.id } });
  const source = await db.group.create({
    data: { name: `Conflict-Source-${runId.slice(0, 8)}`, subject: "Matematik", teacherId: teacherA.id, capacity: 4, isActive: true },
  });
  const other = await db.group.create({
    data: { name: `Conflict-Other-${runId.slice(0, 8)}`, subject: "Fen", teacherId: teacherB.id, capacity: 4, isActive: true },
  });
  const target = await db.group.create({
    data: { name: `Conflict-Target-${runId.slice(0, 8)}`, subject: "Matematik", teacherId: teacherA.id, capacity: 4, isActive: true },
  });

  try {
    await db.enrollment.createMany({
      data: [
        { groupId: source.id, studentId: student.id },
        { groupId: other.id, studentId: student.id },
      ],
    });
    const start = new Date(Date.now() + 3 * 86_400_000);
    start.setUTCHours(10, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    await db.lesson.createMany({
      data: [
        {
          groupId: other.id,
          teacherId: teacherB.id,
          title: "Diğer grup dersi",
          startsAt: start,
          endsAt: end,
          status: "PLANNED",
        },
        {
          groupId: target.id,
          teacherId: teacherA.id,
          title: "Hedef grup dersi",
          startsAt: start,
          endsAt: end,
          status: "PLANNED",
        },
      ],
    });

    const preview = await db.$transaction((tx) =>
      previewStudentTransfer(tx, {
        sourceGroupId: source.id,
        targetGroupId: target.id,
        studentIds: [student.id],
      }),
    );
    assert.equal(preview.canExecute, false);
    assert.ok(
      preview.items[0]?.blockers.some((blocker) => blocker.code === "STUDENT_SCHEDULE_CONFLICT"),
    );
  } finally {
    await db.group.deleteMany({ where: { id: { in: [source.id, other.id, target.id] } } });
    await db.user.deleteMany({ where: { id: { in: [teacherA.id, teacherB.id, studentUser.id] } } });
  }
});

integration("arşiv öğrenci ve arşiv grup transferi reddedilir", async () => {
  const now = new Date();
  const teacher = await db.user.create({
    data: {
      email: `archive-teacher-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "TEACHER",
      status: "ACTIVE",
      fullName: "Archive Teacher",
    },
  });
  const activeUser = await db.user.create({
    data: {
      email: `archive-active-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ACTIVE",
      fullName: "Active Student",
    },
  });
  const archivedUser = await db.user.create({
    data: {
      email: `archive-student-${runId}@example.com`,
      passwordHash: "scrypt$1$8$1$YmFzZTY0$c2hhMDA=",
      mustChangePassword: false,
      inviteAcceptedAt: now,
      role: "STUDENT",
      status: "ARCHIVED",
      fullName: "Archived Student",
    },
  });
  const activeStudent = await db.studentProfile.create({ data: { userId: activeUser.id } });
  const archivedStudent = await db.studentProfile.create({ data: { userId: archivedUser.id } });
  const source = await db.group.create({
    data: { name: `Archive-Source-${runId.slice(0, 8)}`, subject: "Matematik", teacherId: teacher.id, capacity: 4, isActive: true },
  });
  const archivedTarget = await db.group.create({
    data: { name: `Archive-Target-${runId.slice(0, 8)}`, subject: "Matematik", teacherId: teacher.id, capacity: 4, isActive: false },
  });

  try {
    await db.enrollment.createMany({
      data: [
        { groupId: source.id, studentId: activeStudent.id },
        { groupId: source.id, studentId: archivedStudent.id },
      ],
    });

    const archivedStudentPreview = await db.$transaction((tx) =>
      previewStudentTransfer(tx, {
        sourceGroupId: source.id,
        targetGroupId: archivedTarget.id,
        studentIds: [archivedStudent.id],
      }),
    );
    assert.equal(archivedStudentPreview.canExecute, false);
    assert.ok(
      archivedStudentPreview.items[0]?.blockers.some(
        (blocker) => blocker.code === "STUDENT_INACTIVE" || blocker.code === "TARGET_INACTIVE",
      ),
    );

    await assert.rejects(
      async () =>
        db.$transaction(
          (tx) => transferStudentsBetweenGroups(tx, source.id, archivedTarget.id, [activeStudent.id]),
          { isolationLevel: GROUP_MUTATION_ISOLATION },
        ),
      (error: unknown) => error instanceof GroupLifecycleError && error.code === "GROUP_INACTIVE",
    );
  } finally {
    await db.group.deleteMany({ where: { id: { in: [source.id, archivedTarget.id] } } });
    await db.user.deleteMany({ where: { id: { in: [teacher.id, activeUser.id, archivedUser.id] } } });
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
