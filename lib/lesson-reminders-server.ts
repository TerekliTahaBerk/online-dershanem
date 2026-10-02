import "server-only";
import { prisma } from "@/lib/prisma";
import { queueReminderNotification } from "@/lib/reminder-notifications";
import { LESSON_REMINDER_WINDOWS, lessonReminderRange } from "./lesson-reminder-window";
import { ISTANBUL_TIME_ZONE } from "./istanbul-time";
const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: ISTANBUL_TIME_ZONE });

export async function runLessonReminders(now = new Date()) {
  let processed = 0;
  let notifications = 0;
  for (const window of LESSON_REMINDER_WINDOWS) {
    const range = lessonReminderRange(now, window.hours);
    const lessons = await prisma.lesson.findMany({ where: { status: "PLANNED", startsAt: range, group: { isActive: true } }, select: { id: true } });
    for (const candidate of lessons) {
      notifications += await prisma.$transaction(async (tx) => {
        // Yeniden okumada iptal/saati değişmiş ders ve bitmiş ilişkiler alıcı üretmez.
        const lesson = await tx.lesson.findFirst({ where: { id: candidate.id, status: "PLANNED", startsAt: range, group: { isActive: true } }, select: {
          id: true, title: true, startsAt: true, group: { select: { enrollments: { where: { endedAt: null, student: { user: { status: "ACTIVE" } } }, select: { student: { select: { id: true, userId: true, parents: { where: { active: true, endedAt: null, canViewAcademic: true }, select: { parentId: true } } } } } } } },
        } });
        if (!lesson) return 0;
        const recipients = new Map<string, string>();
        for (const enrollment of lesson.group.enrollments) {
          recipients.set(enrollment.student.userId, `/panel/ogrenci/takvim/${lesson.id}`);
          for (const parent of enrollment.student.parents) recipients.set(parent.parentId, `/panel/veli/takvim?studentId=${enrollment.student.id}`);
        }
        let count = 0;
        for (const [userId, href] of recipients) count += await queueReminderNotification(tx, {
          id: `${userId}:LESSON:${lesson.id}:${window.category}`, userId, type: "SYSTEM",
          title: window.category === "T24" ? "Yarınki dersiniz" : "Dersiniz yaklaşıyor",
          body: `${lesson.title} · ${DATE.format(lesson.startsAt)}. Katılım bilgisini ders takviminizden kontrol edebilirsiniz.`, href,
        }, "lessonSummary");
        return count;
      });
      processed += 1;
    }
  }
  return { processed, notifications };
}
