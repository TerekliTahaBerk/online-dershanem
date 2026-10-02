import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after } from "node:test";
import { prisma as db } from "@/lib/prisma";
import { listRecentOverdueAssignments } from "@/lib/panel-reminders-server";
import { runLessonReminders } from "@/lib/lesson-reminders-server";
import { GET as reminderJob } from "@/app/api/cron/panel-reminders/route";
import { integration } from "./integration-utils";
after(() => db.$disconnect());

integration("hatırlatmalar tercihe/ilişkiye uyar; 250 sınırı, soğuma ve vazgeçme işler", async () => {
  const run = randomUUID();
  const student = await db.user.create({ data: { email: `lesson-student-${run}@example.com`, role: "STUDENT", passwordHash: "unused", studentProfile: { create: {} }, notificationPrefs: { create: { inAppEnabled: true } } }, include: { studentProfile: true } });
  const parent = await db.user.create({ data: { email: `lesson-parent-${run}@example.com`, role: "PARENT", passwordHash: "unused", notificationPrefs: { create: { inAppEnabled: false, emailEnabled: true, lessonSummary: false } } } });
  const teacher = await db.user.create({ data: { email: `lesson-teacher-${run}@example.com`, role: "TEACHER", passwordHash: "unused" } });
  const group = await db.group.create({ data: { name: run, subject: "Matematik", teacherId: teacher.id, enrollments: { create: { studentId: student.studentProfile!.id } } } });
  const link = await db.parentStudent.create({ data: { parentId: parent.id, studentId: student.studentProfile!.id } });
  try {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 23.9 * 3_600_000);
    const lesson = await db.lesson.create({ data: { groupId: group.id, teacherId: teacher.id, title: "Test dersi", startsAt, endsAt: new Date(startsAt.getTime() + 3_600_000) } });
    await Promise.all([runLessonReminders(now), runLessonReminders(now)]);
    assert.equal(await db.notification.count({ where: { id: `${student.id}:LESSON:${lesson.id}:T24` } }), 1);
    assert.equal(await db.emailOutbox.count({ where: { id: `reminder-email:${parent.id}:LESSON:${lesson.id}:T24` } }), 0);
    await db.notificationPreference.update({ where: { userId: parent.id }, data: { lessonSummary: true } });
    await runLessonReminders(now);
    await runLessonReminders(now);
    assert.equal(await db.notification.count({ where: { userId: parent.id } }), 0);
    assert.equal(await db.emailOutbox.count({ where: { id: `reminder-email:${parent.id}:LESSON:${lesson.id}:T24` } }), 1);
    await db.parentStudent.update({ where: { id: link.id }, data: { active: false } });
    const blocked = await db.lesson.create({ data: { groupId: group.id, teacherId: teacher.id, title: "Bitmiş veli ilişkisi", startsAt, endsAt: lesson.endsAt } });
    await runLessonReminders(now);
    assert.equal(await db.emailOutbox.count({ where: { id: `reminder-email:${parent.id}:LESSON:${blocked.id}:T24` } }), 0);
    await db.parentStudent.update({ where: { id: link.id }, data: { active: true } });
    await db.enrollment.update({ where: { groupId_studentId: { groupId: group.id, studentId: student.studentProfile!.id } }, data: { endedAt: now } });
    const ended = await db.lesson.create({ data: { groupId: group.id, teacherId: teacher.id, title: "Bitmiş üyelik", startsAt, endsAt: lesson.endsAt } });
    await runLessonReminders(now);
    assert.equal(await db.notification.count({ where: { id: `${student.id}:LESSON:${ended.id}:T24` } }), 0);

    const assignments = Array.from({ length: 251 }, (_, index) => ({ id: `${run}-${index}`, groupId: group.id, createdById: teacher.id, title: `Test çalışma ${index}`, dueAt: new Date(now.getTime() - 86_400_000) }));
    assignments.push({ ...assignments[0], id: `${run}-old`, title: "Test eski çalışma", dueAt: new Date(now.getTime() - 15 * 86_400_000) });
    await db.assignment.createMany({ data: assignments });
    await db.assignmentProgress.createMany({ data: assignments.map((item) => ({ assignmentId: item.id, studentId: student.studentProfile!.id })) });
    const eligible = (await listRecentOverdueAssignments(now)).filter((item) => item.student.userId === student.id);
    assert.equal(eligible.length, 251);
    const invoke = () => reminderJob(new Request("http://localhost/api/cron/panel-reminders", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }));
    assert.equal((await invoke()).status, 200);
    assert.equal(await db.notification.count({ where: { userId: student.id, type: "ASSIGNMENT" } }), 251);
    assert.equal(await db.notification.count({ where: { userId: parent.id, type: "ASSIGNMENT" } }), 0);
    await db.notification.updateMany({ where: { userId: student.id, type: "ASSIGNMENT" }, data: { createdAt: new Date(now.getTime() - 2 * 86_400_000) } });
    await invoke();
    assert.equal(await db.notification.count({ where: { userId: student.id, type: "ASSIGNMENT" } }), 251);
    await db.notification.updateMany({ where: { userId: student.id, type: "ASSIGNMENT" }, data: { createdAt: new Date(now.getTime() - 4 * 86_400_000) } });
    await invoke();
    assert.equal(await db.notification.count({ where: { userId: student.id, type: "ASSIGNMENT" } }), 502);
    assert.equal(await db.notification.count({ where: { userId: student.id, body: { contains: "Test eski çalışma" } } }), 0);
  } finally {
    await db.emailOutbox.deleteMany({ where: { recipients: JSON.stringify([parent.email]) } });
    await db.group.delete({ where: { id: group.id } });
    await db.user.deleteMany({ where: { id: { in: [student.id, parent.id, teacher.id] } } });
  }
});
