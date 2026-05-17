"use server";
import { prisma } from "@/lib/prisma";
import { requirePanelRole } from "@/lib/panel-access";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import type { LessonStatus } from "@prisma/client";
import {
  notifyUsers,
  resolveStudentAudience,
  resolveTeacherUserId,
  expireRelatedNotifications,
} from "@/lib/notifications";
import {
  findLessonConflicts,
  formatConflicts,
  type OccurrenceCheck,
} from "@/lib/scheduling/conflicts";
import { logAudit } from "@/lib/audit";

/*
 * TEKNİK BORÇ NOTU (FAZ 3.5):
 *   Şu an `Lesson.studentId` zorunlu olduğu için sınıf dersi N öğrenciye N satır
 *   fan-out ediliyor; aynı seansı `sessionGroupId` paylaşıyor. Bu yaklaşım
 *   ölçeklenebilir DEĞİL (ör. 30 kişilik sınıf × 12 hafta = 360 satır).
 *   İleride **LessonSession + LessonAttendee** modeline geçilecek:
 *     - LessonSession: 1 oturum = 1 satır (teacher, classroom, course, start, dur)
 *     - LessonAttendee: katılımcı (studentId, sessionId, status)
 *   Bu geçiş büyük migration + tüm sorguların değişmesi anlamına gelir;
 *   FAZ 3.5'te yapılmıyor.
 */

function readStr(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}
function readOpt(fd: FormData, key: string): string | null {
  const v = readStr(fd, key);
  return v || null;
}
function readInt(fd: FormData, key: string, def: number): number {
  const v = parseInt(readStr(fd, key) || "", 10);
  return Number.isFinite(v) && v > 0 ? v : def;
}
function randomId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

const DAY_MS = 86400000;
const MAX_OCCURRENCES = 52;

type RecurrenceMode = "none" | "weekly" | "biweekly";

function parseRecurrence(fd: FormData): RecurrenceMode {
  const r = readStr(fd, "recurrence");
  if (r === "weekly") return "weekly";
  if (r === "biweekly") return "biweekly";
  return "none";
}

function computeOccurrences(base: Date, mode: RecurrenceMode, count: number): Date[] {
  const gapDays = mode === "weekly" ? 7 : mode === "biweekly" ? 14 : 0;
  const safeCount = mode === "none"
    ? 1
    : Math.min(Math.max(count, 1), MAX_OCCURRENCES);
  const out: Date[] = [];
  for (let i = 0; i < safeCount; i++) {
    out.push(new Date(base.getTime() + i * gapDays * DAY_MS));
  }
  return out;
}

/**
 * Lesson planlama. Form alanları:
 *  - teacherId (zorunlu)
 *  - courseId, classroomId, studentId (en az classroomId VEYA studentId)
 *  - title, subject, googleMeetLink, location, notes
 *  - scheduledDate (YYYY-MM-DD), scheduledTime (HH:MM)
 *  - duration (dk, default 60)
 *  - recurrence ("none" | "weekly" | "biweekly")
 *  - weeklyCount (1..52) — tekrar sayısı (biweekly için de aynı sayaç)
 *  - notifyStudents/notifyTeacher/notifyParents (on/off)
 */
export async function createLessonAction(fd: FormData) {
  await requirePanelRole("admin");
  const teacherId = readStr(fd, "teacherId");
  if (!teacherId) throw new Error("Öğretmen zorunlu");

  const courseId = readOpt(fd, "courseId");
  const classroomId = readOpt(fd, "classroomId");
  const studentId = readOpt(fd, "studentId");

  if (!classroomId && !studentId) {
    throw new Error("Sınıf veya öğrenci seçimi zorunlu.");
  }
  if (classroomId && studentId) {
    // Belirsizlik: hangisi? Sınıfı öncelikli al, ama kullanıcıya uyarı vermek için hata at.
    throw new Error("Aynı anda hem sınıf hem bireysel öğrenci seçemezsiniz.");
  }

  const dateStr = readStr(fd, "scheduledDate");
  const timeStr = readStr(fd, "scheduledTime") || "09:00";
  if (!dateStr) throw new Error("Tarih zorunlu");
  const baseDate = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(baseDate.getTime())) throw new Error("Geçersiz tarih/saat.");

  const duration = readInt(fd, "duration", 60);
  const title = readOpt(fd, "title");
  const subject = readOpt(fd, "subject");
  const googleMeetLink = readOpt(fd, "googleMeetLink");
  const location = readOpt(fd, "location");
  const notes = readOpt(fd, "notes");
  const status = ((readStr(fd, "status") as LessonStatus) || "SCHEDULED") as LessonStatus;

  const recurrence = parseRecurrence(fd);
  const requestedCount = readInt(fd, "weeklyCount", 1);
  const occurrenceDates = computeOccurrences(baseDate, recurrence, requestedCount);

  // Course default'lar
  let effectiveCourse: {
    id: string; title: string; subject: string;
    defaultTeacherId: string | null; defaultClassroomId: string | null;
  } | null = null;
  if (courseId) {
    const c = await prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, title: true, subject: true, defaultTeacherId: true, defaultClassroomId: true },
    });
    if (c) effectiveCourse = c;
  }

  // Hedef öğrencileri belirle
  let studentIds: string[];
  if (classroomId) {
    const cs = await prisma.classroomStudent.findMany({
      where: { classroomId, leftAt: null },
      select: { studentId: true },
    });
    studentIds = cs.map((x) => x.studentId);
    if (studentIds.length === 0) {
      throw new Error("Bu sınıfta aktif öğrenci yok. Önce öğrenci ekleyin.");
    }
  } else {
    studentIds = [studentId!];
  }

  // ── Çakışma kontrolü (hard validation) ─────────────────────────────────
  const occChecks: OccurrenceCheck[] = occurrenceDates.map((d) => ({
    scheduledAt: d,
    duration,
  }));
  const conflicts = await findLessonConflicts({
    teacherId,
    classroomId,
    studentIds,
    occurrences: occChecks,
  });
  if (conflicts.length > 0) {
    throw new Error(formatConflicts(conflicts));
  }

  // ── Insert ────────────────────────────────────────────────────────────
  const seriesId = recurrence !== "none" ? randomId("ser") : null;
  const created: { id: string; scheduledAt: Date }[] = [];

  for (const occurAt of occurrenceDates) {
    const sessionGroupId = classroomId ? randomId("ses") : null;

    for (const sId of studentIds) {
      const row = await prisma.lesson.create({
        data: {
          studentId: sId,
          teacherId,
          classroomId,
          courseId,
          seriesId,
          sessionGroupId,
          title: title ?? effectiveCourse?.title ?? null,
          subject: subject ?? effectiveCourse?.subject ?? null,
          scheduledAt: occurAt,
          duration,
          googleMeetLink,
          location,
          notes,
          status,
        },
        select: { id: true, scheduledAt: true },
      });
      created.push(row);
    }
  }

  // ── Bildirimler ───────────────────────────────────────────────────────
  await sendLessonNotifications({
    kind: "CREATED",
    fd,
    studentIds,
    teacherId,
    firstLessonId: created[0]?.id ?? null,
    firstDate: created[0]?.scheduledAt ?? baseDate,
    occurrenceCount: occurrenceDates.length,
    recurrence,
    title: title ?? effectiveCourse?.title ?? subject ?? "Ders",
  });

  // ── Revalidate ────────────────────────────────────────────────────────
  revalidatePaths(courseId, classroomId);

  const firstId = created[0]?.id;
  if (firstId) redirect(`/panel/admin/ders-programi/${firstId}`);
  redirect("/panel/admin/ders-programi");
}

export async function updateLessonAction(lessonId: string, fd: FormData) {
  await requirePanelRole("admin");
  const teacherId = readStr(fd, "teacherId");
  if (!teacherId) throw new Error("Öğretmen zorunlu");

  const dateStr = readStr(fd, "scheduledDate");
  const timeStr = readStr(fd, "scheduledTime") || "09:00";
  if (!dateStr) throw new Error("Tarih zorunlu");
  const when = new Date(`${dateStr}T${timeStr}:00`);
  if (Number.isNaN(when.getTime())) throw new Error("Geçersiz tarih/saat.");

  const existing = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      studentId: true, sessionGroupId: true, classroomId: true,
      courseId: true,
    },
  });
  if (!existing) throw new Error("Ders bulunamadı");

  const applyAll = fd.get("applyAll") === "on" && existing.sessionGroupId;
  const duration = readInt(fd, "duration", 60);

  // Çakışma kontrolü için hedef satırların id'lerini topla (exclude için)
  let targetLessons: { id: string; studentId: string }[];
  if (applyAll && existing.sessionGroupId) {
    targetLessons = await prisma.lesson.findMany({
      where: { sessionGroupId: existing.sessionGroupId },
      select: { id: true, studentId: true },
    });
  } else {
    targetLessons = [{ id: lessonId, studentId: existing.studentId }];
  }
  const excludeIds = targetLessons.map((t) => t.id);
  const studentIdsForCheck = Array.from(new Set(targetLessons.map((t) => t.studentId)));

  const conflicts = await findLessonConflicts({
    teacherId,
    classroomId: existing.classroomId,
    studentIds: studentIdsForCheck,
    occurrences: [{ scheduledAt: when, duration }],
    excludeLessonIds: excludeIds,
  });
  if (conflicts.length > 0) {
    throw new Error(formatConflicts(conflicts));
  }

  const data = {
    teacherId,
    courseId: readOpt(fd, "courseId"),
    title: readOpt(fd, "title"),
    subject: readOpt(fd, "subject"),
    scheduledAt: when,
    duration,
    googleMeetLink: readOpt(fd, "googleMeetLink"),
    location: readOpt(fd, "location"),
    notes: readOpt(fd, "notes"),
    status: ((readStr(fd, "status") as LessonStatus) || "SCHEDULED") as LessonStatus,
  };

  if (applyAll && existing.sessionGroupId) {
    await prisma.lesson.updateMany({
      where: { sessionGroupId: existing.sessionGroupId },
      data,
    });
  } else {
    await prisma.lesson.update({ where: { id: lessonId }, data });
  }

  // Önceki bildirimleri arşivle, yeni bildirim gönder
  await expireRelatedNotifications({
    relatedEntityType: "Lesson",
    relatedEntityIds: excludeIds,
  });

  await sendLessonNotifications({
    kind: "UPDATED",
    fd,
    studentIds: studentIdsForCheck,
    teacherId,
    firstLessonId: lessonId,
    firstDate: when,
    occurrenceCount: targetLessons.length,
    recurrence: "none",
    title: data.title ?? data.subject ?? "Ders",
  });

  revalidatePaths(data.courseId, existing.classroomId);
  redirect(`/panel/admin/ders-programi/${lessonId}`);
}

/**
 * Lesson iptal. SOFT operation: status=CANCELLED.
 *  - applyAll=on ise sessionGroupId'deki tüm satırlar.
 *  - applyAllSeries=on ise seriesId'deki tüm satırlar.
 *  - Önceki bildirimler arşivlenir.
 *  - Hedef katılımcılara "ders iptal edildi" bildirimi gider.
 */
export async function cancelLessonAction(lessonId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const applyAll = fd.get("applyAll") === "on";
  const applyAllSeries = fd.get("applyAllSeries") === "on";

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      sessionGroupId: true, seriesId: true, classroomId: true,
      courseId: true, teacherId: true, scheduledAt: true,
      title: true, subject: true,
    },
  });
  if (!lesson) throw new Error("Ders bulunamadı");

  let scope: { where: Record<string, unknown>; lessonIds: string[]; studentIds: string[] };

  if (applyAllSeries && lesson.seriesId) {
    const rows = await prisma.lesson.findMany({
      where: { seriesId: lesson.seriesId, status: { not: "CANCELLED" } },
      select: { id: true, studentId: true },
    });
    scope = {
      where: { seriesId: lesson.seriesId, status: { not: "CANCELLED" } },
      lessonIds: rows.map((r) => r.id),
      studentIds: rows.map((r) => r.studentId),
    };
  } else if (applyAll && lesson.sessionGroupId) {
    const rows = await prisma.lesson.findMany({
      where: { sessionGroupId: lesson.sessionGroupId, status: { not: "CANCELLED" } },
      select: { id: true, studentId: true },
    });
    scope = {
      where: { sessionGroupId: lesson.sessionGroupId, status: { not: "CANCELLED" } },
      lessonIds: rows.map((r) => r.id),
      studentIds: rows.map((r) => r.studentId),
    };
  } else {
    const single = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: { id: true, studentId: true },
    });
    scope = {
      where: { id: lessonId },
      lessonIds: single ? [single.id] : [],
      studentIds: single ? [single.studentId] : [],
    };
  }

  await prisma.lesson.updateMany({ where: scope.where, data: { status: "CANCELLED" } });

  // Eski bildirimleri arşivle
  await expireRelatedNotifications({
    relatedEntityType: "Lesson",
    relatedEntityIds: scope.lessonIds,
  });

  // Yeni iptal bildirimi
  const fmt = new Intl.DateTimeFormat("tr-TR", {
    weekday: "short", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  const dateLabel = fmt.format(lesson.scheduledAt);
  const titleLine = lesson.title ?? lesson.subject ?? "Ders";

  try {
    const { studentUserIds, parentUserIds } = await resolveStudentAudience(
      Array.from(new Set(scope.studentIds)),
      { includeParents: true },
    );
    const teacherUserId = await resolveTeacherUserId(lesson.teacherId);

    const body = applyAllSeries
      ? `${titleLine} serisi iptal edildi.`
      : applyAll
        ? `${dateLabel} tarihli ${titleLine} dersi iptal edildi.`
        : `${dateLabel} tarihli ${titleLine} dersi iptal edildi.`;

    await Promise.all([
      notifyUsers(studentUserIds, {
        title: "Ders iptal edildi",
        body,
        href: "/panel/ogrenci/ders-programi",
        type: "LESSON",
        category: "EDUCATION",
        inboxPriority: "HIGH",
        priority: "HIGH",
        relatedEntityType: "Lesson",
        relatedEntityId: lessonId,
      }),
      notifyUsers(parentUserIds, {
        title: "Çocuğunuzun dersi iptal edildi",
        body,
        href: "/panel/veli/ders-programi",
        type: "LESSON",
        category: "EDUCATION",
        inboxPriority: "HIGH",
        priority: "HIGH",
        relatedEntityType: "Lesson",
        relatedEntityId: lessonId,
      }),
      teacherUserId
        ? notifyUsers([teacherUserId], {
            title: "Dersiniz iptal edildi",
            body,
            href: "/panel/ogretmen/ders-programi",
            type: "LESSON",
            category: "EDUCATION",
            inboxPriority: "HIGH",
            priority: "HIGH",
            relatedEntityType: "Lesson",
            relatedEntityId: lessonId,
          })
        : Promise.resolve(),
    ]);
  } catch (err) {
    console.warn("[cancelLessonAction] notification failed", err);
  }

  revalidatePaths(lesson.courseId, lesson.classroomId);
  revalidatePath(`/panel/admin/ders-programi/${lessonId}`);

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Lesson",
    entityId: lessonId,
    action: "LESSON_CANCEL",
    summary: `${titleLine} (${dateLabel})`,
    payload: {
      scope: applyAllSeries ? "series" : applyAll ? "session" : "single",
      affectedCount: scope.lessonIds.length,
      seriesId: lesson.seriesId,
      sessionGroupId: lesson.sessionGroupId,
    },
  });
}

/**
 * "Sil" akışı artık SOFT-DELETE'tir: status=CANCELLED.
 *  - scope=single|session|series
 *  - purge=on flag'i ile gerçek silme (sadece test verisi). Bağlı bildirimler
 *    arşivlenir; AssignmentSubmission gibi bağlı kayıt varsa Prisma cascade'leri
 *    schema'da tanımlı olduğu için sorun çıkmaz, aksi halde Prisma hata atar.
 */
export async function deleteLessonAction(lessonId: string, fd: FormData) {
  const ctx = await requirePanelRole("admin");
  const scope = readStr(fd, "scope") || "single";
  const purge = fd.get("purge") === "on";

  if (!purge) {
    // Soft path: cancelLessonAction'a delege et.
    const proxyFd = new FormData();
    if (scope === "session") proxyFd.set("applyAll", "on");
    if (scope === "series") proxyFd.set("applyAllSeries", "on");
    await cancelLessonAction(lessonId, proxyFd);
    redirect("/panel/admin/ders-programi");
  }

  // Hard purge (tehlikeli)
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { sessionGroupId: true, seriesId: true, courseId: true, classroomId: true },
  });
  if (!lesson) {
    redirect("/panel/admin/ders-programi");
  }
  if (!lesson) return;

  let ids: string[];
  if (scope === "series" && lesson.seriesId) {
    const rows = await prisma.lesson.findMany({
      where: { seriesId: lesson.seriesId },
      select: { id: true },
    });
    ids = rows.map((r) => r.id);
  } else if (scope === "session" && lesson.sessionGroupId) {
    const rows = await prisma.lesson.findMany({
      where: { sessionGroupId: lesson.sessionGroupId },
      select: { id: true },
    });
    ids = rows.map((r) => r.id);
  } else {
    ids = [lessonId];
  }

  // Bağlı bildirimler önce arşivlensin
  await expireRelatedNotifications({ relatedEntityType: "Lesson", relatedEntityIds: ids });

  try {
    await prisma.lesson.deleteMany({ where: { id: { in: ids } } });
  } catch (err) {
    // FK kısıtı varsa: bilgilendirici hata
    throw new Error(
      "Bu dersler kalıcı silinemedi (bağlı kayıt olabilir). Bunun yerine İptal Et (soft) kullanın. Teknik: " +
        (err instanceof Error ? err.message : String(err)),
    );
  }

  await logAudit({
    actorUserId: ctx.userId,
    entityType: "Lesson",
    entityId: lessonId,
    action: "LESSON_HARD_DELETE",
    summary: `${ids.length} ders kalıcı silindi (scope=${scope})`,
    payload: { scope, deletedIds: ids.slice(0, 50), totalDeleted: ids.length },
  });

  revalidatePaths(lesson.courseId, lesson.classroomId);
  redirect("/panel/admin/ders-programi");
}

// ── Internal helpers ────────────────────────────────────────────────────────

function revalidatePaths(courseId?: string | null, classroomId?: string | null) {
  revalidatePath("/panel/admin/ders-programi");
  revalidatePath("/panel/admin/dersler");
  if (courseId) revalidatePath(`/panel/admin/dersler/${courseId}`);
  if (classroomId) revalidatePath(`/panel/admin/siniflar/${classroomId}`);
  revalidatePath("/panel/ogrenci/ders-programi");
  revalidatePath("/panel/ogretmen/ders-programi");
  revalidatePath("/panel/veli/ders-programi");
}

async function sendLessonNotifications(p: {
  kind: "CREATED" | "UPDATED";
  fd: FormData;
  studentIds: string[];
  teacherId: string;
  firstLessonId: string | null;
  firstDate: Date;
  occurrenceCount: number;
  recurrence: RecurrenceMode;
  title: string;
}) {
  const notifyStudents = p.fd.get("notifyStudents") !== "off";
  const notifyTeacher = p.fd.get("notifyTeacher") !== "off";
  const notifyParents = p.fd.get("notifyParents") !== "off";

  try {
    const { studentUserIds, parentUserIds } = await resolveStudentAudience(p.studentIds, {
      includeParents: notifyParents,
    });
    const teacherUserId = await resolveTeacherUserId(p.teacherId);

    const fmt = new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
    const dateLabel = fmt.format(p.firstDate);

    const recurNote = p.recurrence === "weekly"
      ? ` (${p.occurrenceCount} haftalık seri)`
      : p.recurrence === "biweekly"
        ? ` (${p.occurrenceCount} adet, iki haftada bir)`
        : "";

    const verb = p.kind === "CREATED" ? "planlandı" : "güncellendi";
    const body = `${p.title} dersi ${verb}. İlk ders: ${dateLabel}${recurNote}.`;

    const tasks: Promise<unknown>[] = [];
    if (notifyStudents && studentUserIds.length > 0) {
      tasks.push(notifyUsers(studentUserIds, {
        title: p.kind === "CREATED" ? "Yeni ders planlandı" : "Ders güncellendi",
        body,
        href: "/panel/ogrenci/ders-programi",
        type: "LESSON",
        category: "EDUCATION",
        relatedEntityType: "Lesson",
        relatedEntityId: p.firstLessonId,
      }));
    }
    if (notifyTeacher && teacherUserId) {
      tasks.push(notifyUsers([teacherUserId], {
        title: p.kind === "CREATED" ? "Size yeni ders atandı" : "Dersiniz güncellendi",
        body,
        href: "/panel/ogretmen/ders-programi",
        type: "LESSON",
        category: "EDUCATION",
        relatedEntityType: "Lesson",
        relatedEntityId: p.firstLessonId,
      }));
    }
    if (notifyParents && parentUserIds.length > 0) {
      tasks.push(notifyUsers(parentUserIds, {
        title: p.kind === "CREATED" ? "Çocuğunuza yeni ders planlandı" : "Çocuğunuzun dersi güncellendi",
        body,
        href: "/panel/veli/ders-programi",
        type: "LESSON",
        category: "EDUCATION",
        relatedEntityType: "Lesson",
        relatedEntityId: p.firstLessonId,
      }));
    }
    await Promise.all(tasks);
  } catch (err) {
    console.warn("[sendLessonNotifications] failed", err);
  }
}
