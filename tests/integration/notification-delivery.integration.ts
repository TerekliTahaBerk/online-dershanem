import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after } from "node:test";
import { prisma as db } from "@/lib/prisma";
import { produceNotification, flushNotificationDeliveries } from "@/lib/notification-producer";
import { formatIstanbulDateInput, istanbulDayStart } from "@/lib/istanbul-time";
import { integration } from "./integration-utils";
after(() => db.$disconnect());
integration("merkezi bildirim sessiz saat, günlük tek özet, tercih ve kaynak iptalini korur", async () => {
  const run = randomUUID();
  const student = await db.user.create({ data: { email: `notify-${run}@example.com`, role: "STUDENT", passwordHash: "unused", studentProfile: { create: {} }, notificationPrefs: { create: { emailEnabled: true } } }, include: { studentProfile: true } });
  const teacher = await db.user.create({ data: { email: `notify-teacher-${run}@example.com`, role: "TEACHER", passwordHash: "unused" } });
  const group = await db.group.create({ data: { name: run, subject: "Matematik", teacherId: teacher.id, enrollments: { create: { studentId: student.studentProfile!.id } } } });
  try {
    const now = new Date(), minute = Math.floor((now.getTime() - istanbulDayStart(now).getTime()) / 60_000);
    const end = (minute + 10) % 1440;
    await db.notificationPreference.update({ where: { userId: student.id }, data: { quietStartMinute: (minute + 1439) % 1440, quietEndMinute: end } });
    const lesson = await db.lesson.create({ data: { groupId: group.id, teacherId: teacher.id, title: "Hatırlatma", startsAt: new Date(now.getTime() + 4 * 86_400_000), endsAt: new Date(now.getTime() + 4 * 86_400_000 + 3_600_000) } });
    const intent = { userId: student.id, sourceType: "LESSON" as const, sourceId: lesson.id, category: "T24", type: "SYSTEM" as const, title: "Yaklaşan ders", body: "Katılım bilgisini kontrol edebilirsiniz." };
    await Promise.all([db.$transaction((tx) => produceNotification(tx, intent, "lessonSummary", now)), db.$transaction((tx) => produceNotification(tx, intent, "lessonSummary", now))]);
    const row = await db.notification.findUniqueOrThrow({ where: { id: `${student.id}:LESSON:${lesson.id}:T24` } });
    assert.equal(row.inAppVisible, false); assert.equal(row.deliveryPending, true);
    assert.equal(await db.emailOutbox.count({ where: { id: `reminder-email:${row.id}` } }), 0);
    await db.lesson.update({ where: { id: lesson.id }, data: { status: "CANCELLED" } });
    await flushNotificationDeliveries(new Date(row.availableAt!.getTime() + 1000));
    assert.equal((await db.notification.findUniqueOrThrow({ where: { id: row.id } })).inAppVisible, false);
    assert.equal(await db.emailOutbox.count({ where: { id: `reminder-email:${row.id}` } }), 0);
    await db.lesson.update({ where: { id: lesson.id }, data: { status: "PLANNED" } });
    await db.notificationPreference.update({ where: { userId: student.id }, data: { quietStartMinute: null, quietEndMinute: null, dailyDigest: true, dailyDigestMinute: (minute + 5) % 1440 } });
    for (const category of ["T1", "SECOND"]) await db.$transaction((tx) => produceNotification(tx, { ...intent, category }, "lessonSummary", now));
    const due = await db.notification.findFirstOrThrow({ where: { userId: student.id, deliveryPending: true } });
    await Promise.all([flushNotificationDeliveries(new Date(due.availableAt!.getTime() + 1000)), flushNotificationDeliveries(new Date(due.availableAt!.getTime() + 1000))]);
    const summaryKey = `${student.id}:SUMMARY:${formatIstanbulDateInput(due.availableAt!)}:DAILY`;
    assert.equal(await db.notification.count({ where: { id: summaryKey, inAppVisible: true } }), 1);
    assert.equal(await db.emailOutbox.count({ where: { id: `reminder-email:${summaryKey}` } }), 1);
    assert.equal(await db.notification.count({ where: { userId: student.id, deliveryPending: true } }), 0);
    await db.$transaction((tx) => produceNotification(tx, { ...intent, category: "LATE" }, "lessonSummary", new Date(due.availableAt!.getTime() + 2000)));
    const late = await db.notification.findFirstOrThrow({ where: { userId: student.id, deliveryPending: true } });
    assert.notEqual(formatIstanbulDateInput(late.availableAt!), formatIstanbulDateInput(due.availableAt!));
    await db.notificationPreference.update({ where: { userId: student.id }, data: { lessonSummary: false } });
    await flushNotificationDeliveries(new Date(late.availableAt!.getTime() + 1000));
    assert.equal(await db.notification.count({ where: { userId: student.id, inAppVisible: true } }), 1);
    assert.equal(await db.emailOutbox.count({ where: { recipients: JSON.stringify([student.email]) } }), 1);
  } finally {
    await db.emailOutbox.deleteMany({ where: { recipients: JSON.stringify([student.email]) } });
    await db.group.delete({ where: { id: group.id } });
    await db.user.deleteMany({ where: { id: { in: [student.id, teacher.id] } } });
  }
});
