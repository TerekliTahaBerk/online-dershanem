import "server-only";

import { createHash } from "node:crypto";
import { deliverEventNotifications, eventNotificationId, type EventNotificationDb, type EventNotificationRow } from "@/lib/panel/event-notifications";

/**
 * Deneme bildirimleri (olay anında üretilenler) — "Deneme" (`examUpdates`)
 * tercihine bağlı. Deneme Ligi'nin zamana bağlı olayları (hatırlatma, kaçırma,
 * sonuç) cron'da üretilir: `lib/odk/student-notifications.ts`.
 *
 * Okul / kurum denemesi (`MockExam`): öğrenci, öğretmen veya koç sonucu girer;
 * diğer taraflar haberdar olur. Öğretmen / koç "sonraki adım"ı onaylayınca
 * öğrenci ve veli bilgilenir. Kaynak `MOCK_EXAM`; push kilit ekranı genel
 * metin kullanır (`lib/push/classification.ts`).
 */

const ACADEMIC_PARENTS = { where: { active: true, endedAt: null, canViewAcademic: true }, select: { parentId: true } } as const;
const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });

function row(userId: string, event: string, category: string, title: string, body: string, href: string, sourceId: string): EventNotificationRow {
  return { id: eventNotificationId("exam", userId, event), userId, type: "SYSTEM", sourceType: "MOCK_EXAM", sourceId, category, title, body, href };
}

function scoped(path: string, studentId: string) {
  return `${path}?studentId=${encodeURIComponent(studentId)}`;
}

const MOCK_EXAM_SELECT = {
  id: true, exam: true, title: true, publisher: true, takenAt: true, nextAction: true, createdById: true,
  sections: { select: { correctCount: true, incorrectCount: true, blankCount: true } },
  student: {
    select: {
      id: true, userId: true, user: { select: { fullName: true } }, parents: ACADEMIC_PARENTS,
      enrollments: { where: { endedAt: null, group: { isActive: true } }, select: { group: { select: { teacherId: true } } } },
      coachAssignments: { where: { endedAt: null }, select: { coach: { select: { userId: true } } } },
    },
  },
} as const;

/** Okul / kurum denemesi sonucu kaydedildi → öğrenci, öğretmen(ler), koç ve veli; kaydı giren hariç. */
export async function notifyMockExamEntered(db: EventNotificationDb, input: { mockExamId: string }) {
  const exam = await db.mockExam.findUnique({ where: { id: input.mockExamId }, select: MOCK_EXAM_SELECT });
  if (!exam) return 0;
  const { student } = exam;
  const name = student.user.fullName?.trim() || "Öğrenci";
  const label = [exam.exam, exam.title || exam.publisher].filter(Boolean).join(" · ");
  const totals = exam.sections.reduce((sum, item) => ({ d: sum.d + item.correctCount, y: sum.y + item.incorrectCount, b: sum.b + item.blankCount }), { d: 0, y: 0, b: 0 });
  const summary = `${label} · ${DATE.format(exam.takenAt)} · ${totals.d} D / ${totals.y} Y / ${totals.b} B`;
  const event = `MOCK:${exam.id}:ENTERED`;
  const actor = exam.createdById;
  const teachers = [...new Set(student.enrollments.map((item) => item.group.teacherId))];
  const coaches = [...new Set(student.coachAssignments.map((item) => item.coach.userId))];
  const rows = [
    ...(actor !== student.userId ? [row(student.userId, event, "MOCK:ENTERED", "Deneme sonucun eklendi 📊", summary, "/panel/ogrenci/denemeler", exam.id)] : []),
    ...teachers.filter((id) => id !== actor).map((id) => row(id, event, "MOCK:ENTERED", "Yeni bir deneme sonucu var 📊", `${name} · ${summary}`, "/panel/ogretmen/denemeler", exam.id)),
    ...coaches.filter((id) => id !== actor && !teachers.includes(id)).map((id) => row(id, event, "MOCK:ENTERED", "Yeni bir deneme sonucu var 📊", `${name} · ${summary}`, `/panel/ogretmen/hazirlik/${student.id}`, exam.id)),
    ...student.parents.map((link) => row(link.parentId, event, "MOCK:ENTERED", "Yeni bir deneme sonucu var 📊", `${name} · ${summary}`, scoped("/panel/veli/denemeler", student.id), exam.id)),
  ];
  return deliverEventNotifications(db, rows, "examUpdates");
}

/** Öğretmen / koç denemeye "sonraki adım" onayladı → öğrenci ve veli. */
export async function notifyMockExamNextAction(db: EventNotificationDb, input: { mockExamId: string }) {
  const exam = await db.mockExam.findUnique({ where: { id: input.mockExamId }, select: MOCK_EXAM_SELECT });
  if (!exam?.nextAction) return 0;
  const { student } = exam;
  const name = student.user.fullName?.trim() || "Öğrenci";
  const label = [exam.exam, exam.title || exam.publisher].filter(Boolean).join(" · ");
  const step = exam.nextAction.length > 140 ? `${exam.nextAction.slice(0, 137)}…` : exam.nextAction;
  // Metin değişirse yeni olay; aynı metin tekrar kaydedilirse sessiz.
  const event = `MOCK:${exam.id}:NEXT:${createHash("sha256").update(exam.nextAction).digest("hex").slice(0, 16)}`;
  return deliverEventNotifications(db, [
    row(student.userId, event, "MOCK:NEXT_ACTION", "Denemen için sonraki adımın hazır 🎯", `${label} · ${step}`, "/panel/ogrenci/denemeler", exam.id),
    ...student.parents.map((link) => row(link.parentId, event, "MOCK:NEXT_ACTION", "Deneme için sonraki adım belirlendi 🎯", `${name} · ${label} · ${step}`, scoped("/panel/veli/denemeler", student.id), exam.id)),
  ], "examUpdates");
}

/** Deneme Ligi denemesi öğrenciye atandı → akademik izinli veliler (öğrenciye olay tüketicisi yazar). */
export async function notifyOdkExamAssignedToParents(db: EventNotificationDb, input: { examId: string; studentProfileId: string }) {
  const [exam, student] = await Promise.all([
    db.odkExam.findUnique({ where: { id: input.examId }, select: { id: true, title: true, startsAt: true } }),
    db.studentProfile.findUnique({ where: { id: input.studentProfileId }, select: { id: true, user: { select: { fullName: true } }, parents: ACADEMIC_PARENTS } }),
  ]);
  if (!exam || !student) return 0;
  const name = student.user.fullName?.trim() || "Öğrenci";
  const when = exam.startsAt ? ` · ${new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Istanbul" }).format(exam.startsAt)}` : "";
  const event = `ODK:${exam.id}:${student.id}:ASSIGNED`;
  return deliverEventNotifications(db, student.parents.map((link) => ({
    id: eventNotificationId("exam", link.parentId, event), userId: link.parentId, type: "SYSTEM" as const,
    sourceType: "ODK_AUDIENCE", category: `ASSIGNED:${student.id}`,
    title: "Çocuğunuzun takvimine yeni bir deneme eklendi 📝", body: `${name} · ${exam.title}${when}`, href: scoped("/panel/odk/veli", student.id),
  })), "examUpdates");
}
