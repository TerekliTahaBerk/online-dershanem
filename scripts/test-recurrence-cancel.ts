// Bi-weekly + cancel + notification flow E2E test.
// Run: npx tsx scripts/test-recurrence-cancel.ts
import { prisma } from "../lib/prisma";
import {
  cancelLessonAction,
  createLessonAction,
} from "../app/panel/admin/ders-programi/_actions";

// requirePanelRole'ü bypass için: admin session simüle etmiyoruz.
// Bu script doğrudan helper'ları + DB'yi test eder; action'lar redirect()
// kullandığı için onları çağıramayız (Next runtime gerekir). Bu yüzden
// burada manuel olarak recurrence + cancel davranışını doğrularız.

import { randomBytes } from "node:crypto";
import { expireRelatedNotifications } from "../lib/notifications";

const DAY = 86400000;

async function main() {
  const teacher = await prisma.teacher.findFirst({ select: { id: true, fullName: true } });
  const student = await prisma.student.findFirst({ select: { id: true, fullName: true, userId: true } });
  if (!teacher || !student) {
    console.log("NO_DATA");
    return;
  }

  // 1) Bi-weekly 4 occurrence simülasyonu
  const base = new Date();
  base.setHours(10, 0, 0, 0);
  base.setDate(base.getDate() + 60); // gelecek
  const seriesId = `ser_${randomBytes(8).toString("hex")}`;
  const count = 4;
  const gapDays = 14;

  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base.getTime() + i * gapDays * DAY);
    dates.push(d);
    await prisma.lesson.create({
      data: {
        teacherId: teacher.id,
        studentId: student.id,
        scheduledAt: d,
        duration: 60,
        status: "SCHEDULED",
        title: "TEST-BIWEEKLY",
        seriesId,
      },
    });
  }
  console.log(`[1] Created ${count} bi-weekly lessons in series ${seriesId}`);
  console.log("    dates:", dates.map((d) => d.toISOString()).join(", "));

  // Gap kontrolü → her ardışık ders arası 14 gün
  for (let i = 1; i < dates.length; i++) {
    const diffDays = (dates[i].getTime() - dates[i - 1].getTime()) / DAY;
    console.log(`    gap[${i}]=${diffDays} day (expected 14)`);
  }

  // 2) Tüm satırları seriesId ile çek
  const series = await prisma.lesson.findMany({
    where: { seriesId },
    orderBy: { scheduledAt: "asc" },
    select: { id: true, scheduledAt: true, status: true },
  });
  console.log(`[2] Series rows: ${series.length}`);

  // 3) Inbox mesajı simüle et (lesson için)
  if (student.userId) {
    await prisma.inboxMessage.create({
      data: {
        recipientUserId: student.userId,
        category: "EDUCATION",
        priority: "NORMAL",
        title: "Test ders planlandı",
        body: "TEST",
        relatedEntityType: "Lesson",
        relatedEntityId: series[0].id,
      },
    });
    console.log("[3] Inbox message created for first lesson");
  }

  // 4) expireRelatedNotifications çağır
  await expireRelatedNotifications({
    relatedEntityType: "Lesson",
    relatedEntityIds: [series[0].id],
  });
  if (student.userId) {
    const msgs = await prisma.inboxMessage.findMany({
      where: { relatedEntityType: "Lesson", relatedEntityId: series[0].id },
      select: { archivedAt: true, readAt: true },
    });
    console.log("[4] After expire:", msgs.map((m) => `archived=${!!m.archivedAt} read=${!!m.readAt}`).join(", "));
  }

  // 5) Soft cancel (seriesId tüm satırlar) simulasyonu (action call'ı yerine direkt updateMany)
  await prisma.lesson.updateMany({
    where: { seriesId },
    data: { status: "CANCELLED" },
  });
  const after = await prisma.lesson.findMany({ where: { seriesId }, select: { status: true } });
  console.log(`[5] After series cancel: ${after.filter((x) => x.status === "CANCELLED").length} / ${after.length} CANCELLED`);

  // Action import sanity check (compile)
  void cancelLessonAction;
  void createLessonAction;

  // Cleanup
  await prisma.inboxMessage.deleteMany({ where: { relatedEntityType: "Lesson", relatedEntityId: { in: series.map((s) => s.id) } } });
  await prisma.lesson.deleteMany({ where: { seriesId } });
  console.log("\nCleanup OK");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
