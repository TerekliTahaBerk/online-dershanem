import "server-only";

import type { NotificationRow } from "@/lib/panel-notifications";
import { deliverEventNotifications, eventNotificationId, type EventNotificationDb } from "@/lib/panel/event-notifications";

/**
 * Ödev ve plan görevi bildirimleri — öğrenci, veli, öğretmen ve koç.
 *
 * Tüm satırlar "assignment" tercihine bağlıdır (mobilde "Çalışmalar ve
 * ödevler"); kullanıcı kategoriyi kapatırsa uygulama içi, e-posta ve push
 * birlikte susar. Satır kimliği olaydan türetilir: aynı görevin tekrar
 * işaretlenmesi (çift dokunma, geri al → yeniden tamamla) ikinci bildirim
 * üretmez.
 *
 * `category` push kilit ekranı metnini seçer (`lib/push/classification.ts`).
 * Push gövdesi kişisel veri taşımaz; ayrıntı bildirim açılınca okunur.
 */

type Db = EventNotificationDb;
export type StudyNotificationCategory = "ASSIGNMENT:NEW" | "ASSIGNMENT:DONE" | "ASSIGNMENT:SUBMITTED" | "ASSIGNMENT:REVIEWED" | "PLAN_TASK:DONE" | "PLAN_TASK:ADDED" | "PLAN:PUBLISHED";
type StudyRow = NotificationRow & { id: string; category: StudyNotificationCategory };

const ACADEMIC_PARENTS = { where: { active: true, endedAt: null, canViewAcademic: true }, select: { parentId: true } } as const;
const DATE = new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeZone: "Europe/Istanbul" });

function row(userId: string, event: string, category: StudyNotificationCategory, title: string, body: string, href: string): StudyRow {
  return { id: eventNotificationId("study", userId, event), userId, type: "ASSIGNMENT", category, title, body, href };
}

function studentName(student: { user: { fullName: string | null } }) {
  return student.user.fullName?.trim() || "Öğrenci";
}

function parentHref(path: string, studentId: string) {
  return `${path}?studentId=${encodeURIComponent(studentId)}`;
}

function deliver(db: Db, rows: StudyRow[]) {
  return deliverEventNotifications(db, rows, "assignment");
}

/** Öğretmen yeni ödev girdi → gruptaki her öğrenci ve akademik izinli velileri. */
export async function notifyAssignmentCreated(db: Db, assignmentId: string) {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: {
      id: true, title: true, dueAt: true,
      group: { select: { name: true, teacher: { select: { fullName: true } }, enrollments: { where: { endedAt: null }, select: { student: { select: { id: true, userId: true, user: { select: { fullName: true } }, parents: ACADEMIC_PARENTS } } } } } },
    },
  });
  if (!assignment) return 0;
  const due = DATE.format(assignment.dueAt);
  const teacher = assignment.group.teacher.fullName?.trim();
  const event = `ASSIGNMENT:${assignment.id}:NEW`;
  const rows = assignment.group.enrollments.flatMap(({ student }) => [
    row(student.userId, event, "ASSIGNMENT:NEW", "Yeni bir ödevin var 📚", `${assignment.title} · ${assignment.group.name}${teacher ? ` · ${teacher}` : ""} · son tarih ${due}. Kendi temponda başlayabilirsin 🌱`, "/panel/ogrenci/odevler"),
    ...student.parents.map((link) => row(link.parentId, `${event}:${student.id}`, "ASSIGNMENT:NEW", "Çocuğunuza yeni bir ödev verildi 📚", `${studentName(student)} · ${assignment.title} · son tarih ${due}`, parentHref("/panel/veli/odevler", student.id))),
  ]);
  return deliver(db, rows);
}

/** Öğrenci ödevi tamamladı → grubun öğretmeni ve akademik izinli veliler. */
export async function notifyAssignmentCompleted(db: Db, input: { assignmentId: string; studentProfileId: string }) {
  const [assignment, student] = await Promise.all([
    db.assignment.findUnique({ where: { id: input.assignmentId }, select: { id: true, title: true, group: { select: { name: true, teacherId: true } } } }),
    db.studentProfile.findUnique({ where: { id: input.studentProfileId }, select: { id: true, user: { select: { fullName: true } }, parents: ACADEMIC_PARENTS } }),
  ]);
  if (!assignment || !student) return 0;
  const name = studentName(student);
  const event = `ASSIGNMENT:${assignment.id}:${student.id}:DONE`;
  return deliver(db, [
    row(assignment.group.teacherId, event, "ASSIGNMENT:DONE", "Bir ödev tamamlandı ✅", `${name} · ${assignment.title} (${assignment.group.name}) ödevini tamamladı.`, "/panel/ogretmen/odevler"),
    ...student.parents.map((link) => row(link.parentId, event, "ASSIGNMENT:DONE", "Çocuğunuz ödevini tamamladı 🎉", `${name} · ${assignment.title} ödevini tamamladı. Küçük bir tebrik ona iyi gelebilir 💛`, parentHref("/panel/veli/odevler", student.id))),
  ]);
}

/** Öğrenci kanıtlı ödev teslim etti → öğretmen (değerlendirme bekliyor). */
export async function notifyAssignmentSubmitted(db: Db, input: { submissionId: string }) {
  const submission = await db.assignmentSubmission.findUnique({
    where: { id: input.submissionId },
    select: { id: true, attemptNumber: true, assignment: { select: { title: true, group: { select: { teacherId: true } } } }, student: { select: { user: { select: { fullName: true } } } } },
  });
  if (!submission) return 0;
  const retry = submission.attemptNumber > 1 ? ` (${submission.attemptNumber}. deneme)` : "";
  return deliver(db, [
    row(submission.assignment.group.teacherId, `SUBMISSION:${submission.id}`, "ASSIGNMENT:SUBMITTED", "Değerlendirmenizi bekleyen bir ödev var 📥", `${studentName(submission.student)} · ${submission.assignment.title}${retry} teslim etti.`, "/panel/ogretmen/odevler"),
  ]);
}

/** Öğretmen teslimi değerlendirdi → öğrenci ve akademik izinli veliler. */
export async function notifyAssignmentReviewed(db: Db, input: { submissionId: string; approved: boolean }) {
  const submission = await db.assignmentSubmission.findUnique({
    where: { id: input.submissionId },
    select: { id: true, assignment: { select: { title: true } }, student: { select: { id: true, userId: true, user: { select: { fullName: true } }, parents: ACADEMIC_PARENTS } } },
  });
  if (!submission) return 0;
  const { student } = submission;
  const event = `SUBMISSION:${submission.id}:REVIEWED`;
  const title = submission.assignment.title;
  return deliver(db, [
    input.approved
      ? row(student.userId, event, "ASSIGNMENT:REVIEWED", "Ödevin onaylandı, tebrikler! 🎉", `${title} · öğretmeninin geri bildirimi seni bekliyor.`, "/panel/ogrenci/odevler")
      : row(student.userId, event, "ASSIGNMENT:REVIEWED", "Ödevin için küçük bir dokunuş kaldı ✍️", `${title} · öğretmeninin notlarına göz atıp yeni bir deneme gönderebilirsin. Çok az kaldı! 💪`, "/panel/ogrenci/odevler"),
    ...student.parents.map((link) => row(link.parentId, event, "ASSIGNMENT:REVIEWED", input.approved ? "Ödev onaylandı 🎉" : "Ödev için küçük bir düzeltme istendi ✍️", `${studentName(student)} · ${title} ${input.approved ? "öğretmen tarafından onaylandı." : "için öğretmen küçük bir düzeltme ve yeni bir deneme istedi."}`, parentHref("/panel/veli/odevler", student.id))),
  ]);
}

const COMPLETION_VERB = { DONE: "tamamladı", PARTIAL: "kısmen tamamladı", COULD_NOT: "yapamadığını bildirdi" } as const;
const CLOSED = new Set(["DONE", "PARTIAL", "COULD_NOT", "SKIPPED"]);

/**
 * Öğrenci plan görevini (madde) kapattı → aktif koç(lar) ve akademik izinli
 * veliler. Gövde günün ilerlemesini taşır; günün son maddesi kapanınca
 * başlık "günün planı tamamlandı" olur.
 */
export async function notifyPlanTaskCompleted(db: Db, input: { taskId: string; status: keyof typeof COMPLETION_VERB }) {
  const task = await db.weeklyPlanTask.findUnique({
    where: { id: input.taskId },
    select: {
      id: true, title: true, planId: true, scheduledFor: true,
      plan: { select: { student: { select: { id: true, user: { select: { fullName: true } }, parents: ACADEMIC_PARENTS, coachAssignments: { where: { endedAt: null }, select: { coach: { select: { userId: true } } } } } } } },
    },
  });
  if (!task) return 0;
  const dayTasks = await db.weeklyPlanTask.findMany({ where: { planId: task.planId, scheduledFor: task.scheduledFor }, select: { status: true } });
  const closed = dayTasks.filter((item) => CLOSED.has(item.status)).length;
  const done = dayTasks.filter((item) => item.status === "DONE").length;
  const dayFinished = dayTasks.length > 0 && closed === dayTasks.length;
  const { student } = task.plan;
  const name = studentName(student);
  const verb = COMPLETION_VERB[input.status];
  const progress = `günün görevleri: ${done}/${dayTasks.length} tamamlandı`;
  const body = `${name} · "${task.title}" görevini ${verb}. (${progress})`;
  const event = `PLAN_TASK:${task.id}:${input.status}`;
  const coachTitle = dayFinished ? "Öğrencin günün planını bitirdi 🎉" : input.status === "COULD_NOT" ? "Öğrencin bir görevde desteğe ihtiyaç duyabilir 🤝" : "Bir plan görevi tamamlandı ✅";
  const parentTitle = dayFinished ? "Çocuğunuz günün planını bitirdi 🎉" : input.status === "COULD_NOT" ? "Çocuğunuz bir görevde zorlandı 🤝" : "Çocuğunuz bir görevi tamamladı ✅";
  const coaches = [...new Set(student.coachAssignments.map((item) => item.coach.userId))];
  return deliver(db, [
    ...coaches.map((userId) => row(userId, event, "PLAN_TASK:DONE", coachTitle, body, `/panel/ogretmen/hazirlik/${student.id}`)),
    ...student.parents.map((link) => row(link.parentId, event, "PLAN_TASK:DONE", parentTitle, body, parentHref("/panel/veli/kocluk", student.id))),
  ]);
}

/** Koç yayınlanmış plana yeni görev ekledi → öğrenci ve akademik izinli veliler. */
export async function notifyPlanTaskAdded(db: Db, input: { taskId: string }) {
  const task = await db.weeklyPlanTask.findUnique({
    where: { id: input.taskId },
    select: { id: true, title: true, scheduledFor: true, plan: { select: { status: true, student: { select: { id: true, userId: true, user: { select: { fullName: true } }, parents: ACADEMIC_PARENTS } } } } },
  });
  if (!task || task.plan.status !== "APPROVED") return 0;
  const { student } = task.plan;
  const day = DATE.format(task.scheduledFor);
  const event = `PLAN_TASK:${task.id}:ADDED`;
  return deliver(db, [
    row(student.userId, event, "PLAN_TASK:ADDED", "Planına yeni bir görev eklendi 🗓️", `${task.title} · ${day}`, "/panel/ogrenci/plan"),
    ...student.parents.map((link) => row(link.parentId, event, "PLAN_TASK:ADDED", "Koç plana yeni bir görev ekledi 🗓️", `${studentName(student)} · ${task.title} · ${day}`, parentHref("/panel/veli/kocluk", student.id))),
  ]);
}

/** Koç haftalık planı yayınladı → akademik izinli veliler (öğrenci olay tüketicisinden alır). */
export async function notifyPlanPublishedToParents(db: Db, input: { planId: string }) {
  const plan = await db.weeklyPlan.findUnique({
    where: { id: input.planId },
    select: { id: true, weekStart: true, _count: { select: { tasks: true } }, student: { select: { id: true, user: { select: { fullName: true } }, parents: ACADEMIC_PARENTS } } },
  });
  if (!plan) return 0;
  const { student } = plan;
  const event = `PLAN:${plan.id}:PUBLISHED`;
  return deliver(db, student.parents.map((link) => row(link.parentId, event, "PLAN:PUBLISHED", "Haftalık plan hazır 🗓️", `${studentName(student)} · ${DATE.format(plan.weekStart)} haftası · ${plan._count.tasks} görev`, parentHref("/panel/veli/kocluk", student.id))));
}
