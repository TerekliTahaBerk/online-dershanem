/**
 * Parent dashboard query helpers — Phase 2 / Session 3.
 *
 * Child-centered, parent-scoped data layer for `/panel/veli`. Every helper
 * takes `(parentId, studentId)` and **re-verifies the ParentStudent link
 * internally** before issuing any further query. This is defense-in-depth:
 * even if a future caller forgets to gate at the route layer, no helper here
 * will ever return another child's data.
 *
 * Notes on the data model:
 *   - Lessons & Assignments can be (a) student-direct, (b) classroom-wide,
 *     or both. We always union via classroom membership (leftAt: null).
 *   - ODK is keyed on `User.id`, not `Student.id`. The student must have a
 *     linked `userId` for ODK helpers to return data — otherwise empty.
 *   - There is no recurring `Order`/`Payment due` model in this codebase;
 *     we use `PurchaseIntent` for in-flight requests and `AccountingEntry`
 *     for already-recorded INCOME. We never invent "overdue" totals.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import type { AttendanceStatus, SubmissionStatus } from "@prisma/client";
import {
  getAssignmentOperationalStatus,
  type AssignmentOperationalStatus,
} from "@/lib/homework";
import {
  getParentRelationshipLabel,
  type ParentRelationshipType,
} from "@/lib/parents";

// ─────────────────────────────────────────────────────────────────────────────
// Date math (local wall-clock; matches all other panel pages)
// ─────────────────────────────────────────────────────────────────────────────

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}
function daysAhead(n: number): Date {
  return new Date(Date.now() + n * 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Linked-students roster + auth gate
// ─────────────────────────────────────────────────────────────────────────────

export type ParentLinkedStudent = {
  studentId: string;
  fullName: string;
  classLevel: string | null;
  examType: string | null;
  userId: string | null;
  /** Birincil (öncelikli iletişim) çocuk mu? */
  isPrimary: boolean;
  /** "Anne" / "Baba" / "Vasi" / serbest metin */
  relationshipLabel: string;
  relationshipType: ParentRelationshipType | null;
  /** Aktif sınıflar — birden fazla olabilir, ilkinin adı header'da gösterilir. */
  classroomNames: string[];
};

export async function getParentLinkedStudents(
  parentId: string,
): Promise<ParentLinkedStudent[]> {
  const links = await prisma.parentStudent.findMany({
    where: { parentId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    include: {
      student: {
        select: {
          id: true,
          fullName: true,
          classLevel: true,
          examType: true,
          userId: true,
          classrooms: {
            where: { leftAt: null },
            select: { classroom: { select: { name: true } } },
          },
        },
      },
    },
  });

  return links.map((l) => {
    // `relationshipType` may not yet exist on the local Prisma client even
    // though it's in the schema (Phase-1.5 migration window). Read it
    // defensively — falling back to the legacy free-text `relationship`.
    const rt = (l as unknown as { relationshipType?: string | null }).relationshipType ?? null;
    return {
      studentId: l.studentId,
      fullName: l.student.fullName,
      classLevel: l.student.classLevel,
      examType: l.student.examType,
      userId: l.student.userId,
      isPrimary: l.isPrimary,
      relationshipLabel: getParentRelationshipLabel(rt, l.relationship ?? null),
      relationshipType: rt as ParentRelationshipType | null,
      classroomNames: l.student.classrooms.map((c) => c.classroom.name),
    };
  });
}

/**
 * Pure function — no DB. Picks the active child given a roster and the
 * `?studentId=` query parameter. If the requested ID is not linked, falls
 * back silently to the first child (does NOT throw — UX choice: a stale
 * bookmark from another browser session shouldn't 404 the whole panel).
 */
export function pickSelectedStudent(
  roster: ParentLinkedStudent[],
  requestedId?: string | null,
): { selected: ParentLinkedStudent | null; isFallback: boolean } {
  if (roster.length === 0) return { selected: null, isFallback: false };
  if (requestedId) {
    const hit = roster.find((s) => s.studentId === requestedId);
    if (hit) return { selected: hit, isFallback: false };
    // Requested ID not in roster → silently fall back to primary/first.
    return { selected: roster[0], isFallback: true };
  }
  return { selected: roster[0], isFallback: false };
}

/**
 * Hard auth gate used by every per-student helper below. Returns `false`
 * if the (parentId, studentId) link does not exist; helpers must treat
 * `false` as "return empty" — never as "leak data".
 */
async function ownsStudent(parentId: string, studentId: string): Promise<boolean> {
  const link = await prisma.parentStudent.findUnique({
    where: { parentId_studentId: { parentId, studentId } },
    select: { parentId: true },
  });
  return !!link;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) Today timeline — "Çocuğum bugün ne yaptı?"
// ─────────────────────────────────────────────────────────────────────────────

export type TimelineTone = "positive" | "neutral" | "warning" | "danger";
export type TimelineEventKind =
  | "LESSON_TODAY"
  | "ATTENDANCE"
  | "ASSIGNMENT_PUBLISHED"
  | "SUBMISSION"
  | "GRADED"
  | "ODK_SUBMITTED";

export type ParentTimelineEvent = {
  id: string;
  kind: TimelineEventKind;
  /** Sıralama anahtarı; mümkünse ilgili tarih, değilse "now". */
  occurredAt: Date;
  /** İnsan-okur Türkçe satır. */
  message: string;
  /** Saat etiketi (HH:mm) — sadece zamanlı eventlerde. */
  timeLabel: string | null;
  tone: TimelineTone;
  /** Tıklanabilir hedef. Eğer panel yoluna eşleyemiyorsak null. */
  href: string | null;
};

export async function getParentTodayTimeline(
  parentId: string,
  studentId: string,
  studentUserId: string | null,
): Promise<ParentTimelineEvent[]> {
  if (!(await ownsStudent(parentId, studentId))) return [];

  const dayStart = startOfDay();
  const dayEnd = endOfDay();

  const [lessonsToday, attendanceToday, publishedToday, submittedToday, gradedToday, odkToday] =
    await Promise.all([
      // Today's lessons (direct + classroom-wide).
      prisma.lesson.findMany({
        where: {
          OR: [
            { studentId },
            { classroom: { students: { some: { studentId, leftAt: null } } } },
          ],
          scheduledAt: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { scheduledAt: "asc" },
        select: {
          id: true,
          scheduledAt: true,
          title: true,
          subject: true,
          status: true,
        },
      }),
      // Attendance recorded today (any session).
      prisma.attendance.findMany({
        where: { studentId, sessionDate: { gte: dayStart, lte: dayEnd } },
        orderBy: { sessionDate: "asc" },
        select: { id: true, sessionDate: true, status: true, lessonId: true },
      }),
      // Assignments published today (createdAt) for this student.
      prisma.assignment.findMany({
        where: {
          OR: [
            { studentId },
            { classroom: { students: { some: { studentId, leftAt: null } } } },
          ],
          status: "PUBLISHED",
          createdAt: { gte: dayStart, lte: dayEnd },
        },
        orderBy: { createdAt: "asc" },
        select: { id: true, title: true, createdAt: true, dueAt: true },
      }),
      // Submissions submitted today.
      prisma.assignmentSubmission.findMany({
        where: { studentId, submittedAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { submittedAt: "asc" },
        select: {
          id: true,
          submittedAt: true,
          assignmentId: true,
          assignment: { select: { title: true } },
        },
      }),
      // Submissions graded today.
      prisma.assignmentSubmission.findMany({
        where: { studentId, gradedAt: { gte: dayStart, lte: dayEnd } },
        orderBy: { gradedAt: "asc" },
        select: {
          id: true,
          gradedAt: true,
          score: true,
          assignmentId: true,
          assignment: { select: { title: true, maxScore: true } },
        },
      }),
      // ODK attempts submitted today (only if student has linked user).
      studentUserId
        ? prisma.odkExamAttempt.findMany({
            where: {
              userId: studentUserId,
              status: "SUBMITTED",
              submittedAt: { gte: dayStart, lte: dayEnd },
            },
            orderBy: { submittedAt: "asc" },
            select: {
              id: true,
              submittedAt: true,
              correctCount: true,
              wrongCount: true,
              exam: { select: { title: true } },
            },
          })
        : Promise.resolve([] as { id: string; submittedAt: Date | null; correctCount: number; wrongCount: number; exam: { title: string } | null }[]),
    ]);

  const events: ParentTimelineEvent[] = [];
  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(d);

  for (const l of lessonsToday) {
    events.push({
      id: `lesson:${l.id}`,
      kind: "LESSON_TODAY",
      occurredAt: l.scheduledAt,
      timeLabel: fmtTime(l.scheduledAt),
      message: `${l.title ?? l.subject ?? "Ders"} (${
        l.status === "COMPLETED" ? "tamamlandı"
          : l.status === "LIVE" ? "canlı"
          : l.status === "CANCELLED" ? "iptal"
          : "planlı"
      })`,
      tone:
        l.status === "CANCELLED" ? "warning"
          : l.status === "COMPLETED" ? "positive"
          : "neutral",
      href: "/panel/veli/ders-programi",
    });
  }

  for (const a of attendanceToday) {
    // `LEFT_EARLY` may not be in the locally-generated Prisma client even
    // though migration 0028 adds it. Compare via string for forward compat.
    const status = a.status as string;
    const isAbsent = status === "ABSENT";
    const isLate = status === "LATE" || status === "LEFT_EARLY";
    events.push({
      id: `att:${a.id}`,
      kind: "ATTENDANCE",
      occurredAt: a.sessionDate,
      timeLabel: fmtTime(a.sessionDate),
      message:
        status === "PRESENT" ? "Derse katıldı"
          : status === "ABSENT" ? "Derse katılmadı"
          : status === "LATE" ? "Derse geç katıldı"
          : status === "LEFT_EARLY" ? "Dersten erken ayrıldı"
          : status === "EXCUSED" ? "Mazeretli sayıldı"
          : `Yoklama: ${status}`,
      tone: isAbsent ? "danger" : isLate ? "warning" : "positive",
      href: "/panel/veli/devam",
    });
  }

  for (const a of publishedToday) {
    events.push({
      id: `pub:${a.id}`,
      kind: "ASSIGNMENT_PUBLISHED",
      occurredAt: a.createdAt,
      timeLabel: fmtTime(a.createdAt),
      message: `Yeni ödev: ${a.title}${a.dueAt ? ` · son ${new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" }).format(a.dueAt)}` : ""}`,
      tone: "neutral",
      href: "/panel/veli/odev-takibi",
    });
  }

  for (const s of submittedToday) {
    if (!s.submittedAt) continue;
    events.push({
      id: `sub:${s.id}`,
      kind: "SUBMISSION",
      occurredAt: s.submittedAt,
      timeLabel: fmtTime(s.submittedAt),
      message: `Ödev teslim edildi: ${s.assignment.title}`,
      tone: "positive",
      href: "/panel/veli/odev-takibi",
    });
  }

  for (const g of gradedToday) {
    if (!g.gradedAt) continue;
    const max = g.assignment.maxScore ?? 100;
    const scoreLabel = g.score != null ? ` (${g.score}/${max})` : "";
    const tone: TimelineTone =
      g.score == null ? "neutral"
        : g.score / max >= 0.7 ? "positive"
        : g.score / max >= 0.5 ? "warning"
        : "danger";
    events.push({
      id: `grd:${g.id}`,
      kind: "GRADED",
      occurredAt: g.gradedAt,
      timeLabel: fmtTime(g.gradedAt),
      message: `Ödev değerlendirildi: ${g.assignment.title}${scoreLabel}`,
      tone,
      href: "/panel/veli/odev-takibi",
    });
  }

  for (const o of odkToday) {
    if (!o.submittedAt) continue;
    const net = Math.round((o.correctCount - o.wrongCount / 4) * 100) / 100;
    events.push({
      id: `odk:${o.id}`,
      kind: "ODK_SUBMITTED",
      occurredAt: o.submittedAt,
      timeLabel: fmtTime(o.submittedAt),
      message: `Deneme tamamlandı: ${o.exam?.title ?? "ODK"} · net ${net}`,
      tone: net >= 0 ? "positive" : "neutral",
      href: studentUserId ? `/panel/veli/odk/cocuklarim/${studentUserId}` : "/panel/veli/odk",
    });
  }

  events.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  return events;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Upcoming lessons (today → +7d)
// ─────────────────────────────────────────────────────────────────────────────

export type ParentUpcomingLesson = {
  id: string;
  scheduledAt: Date;
  duration: number;
  title: string | null;
  subject: string | null;
  status: string;
  classroomName: string | null;
  teacherName: string | null;
  meetingJoinUrl: string | null;
  googleMeetLink: string | null;
};

export async function getParentUpcomingLessons(
  parentId: string,
  studentId: string,
): Promise<ParentUpcomingLesson[]> {
  if (!(await ownsStudent(parentId, studentId))) return [];

  const lessons = await prisma.lesson.findMany({
    where: {
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
      scheduledAt: { gte: startOfDay(), lte: endOfDay(daysAhead(7)) },
    },
    orderBy: { scheduledAt: "asc" },
    select: {
      id: true,
      scheduledAt: true,
      duration: true,
      title: true,
      subject: true,
      status: true,
      meetingJoinUrl: true,
      googleMeetLink: true,
      classroom: { select: { name: true } },
      teacher: { select: { fullName: true } },
    },
  });

  // Same student can appear in fan-out group lessons; collapse by start-minute.
  const seen = new Set<string>();
  const out: ParentUpcomingLesson[] = [];
  for (const l of lessons) {
    const key = `${Math.floor(l.scheduledAt.getTime() / 60000)}:${l.subject ?? l.title ?? ""}:${l.classroom?.name ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: l.id,
      scheduledAt: l.scheduledAt,
      duration: l.duration,
      title: l.title,
      subject: l.subject,
      status: l.status,
      classroomName: l.classroom?.name ?? null,
      teacherName: l.teacher?.fullName ?? null,
      meetingJoinUrl: l.meetingJoinUrl,
      googleMeetLink: l.googleMeetLink,
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Attendance summary (last 30 days)
// ─────────────────────────────────────────────────────────────────────────────

export type ParentAttendanceSummary = {
  totalRecords: number;
  byStatus: Record<string, number>;
  recent: Array<{ id: string; sessionDate: Date; status: string; lessonTitle: string | null }>;
  /** Veliye uyarı çıkarılmalı mı? (≥2 absent veya ≥2 late/leftEarly) */
  warning: { active: boolean; reason: string | null };
};

const EMPTY_BY_STATUS = (): Record<string, number> => ({
  PRESENT: 0,
  LATE: 0,
  ABSENT: 0,
  EXCUSED: 0,
  LEFT_EARLY: 0,
});

export async function getParentAttendanceSummary(
  parentId: string,
  studentId: string,
): Promise<ParentAttendanceSummary> {
  if (!(await ownsStudent(parentId, studentId))) {
    return { totalRecords: 0, byStatus: EMPTY_BY_STATUS(), recent: [], warning: { active: false, reason: null } };
  }

  const since = daysAgo(30);
  const rows = await prisma.attendance.findMany({
    where: { studentId, sessionDate: { gte: since } },
    orderBy: { sessionDate: "desc" },
    select: {
      id: true,
      sessionDate: true,
      status: true,
      lesson: { select: { title: true, subject: true } },
    },
  });

  const byStatus = EMPTY_BY_STATUS();
  for (const r of rows) byStatus[r.status]++;

  const absent = byStatus.ABSENT;
  const lateLike = byStatus.LATE + byStatus.LEFT_EARLY;
  let warning: ParentAttendanceSummary["warning"] = { active: false, reason: null };
  if (absent >= 2) warning = { active: true, reason: `Son 30 günde ${absent} devamsızlık` };
  else if (lateLike >= 2) warning = { active: true, reason: `Son 30 günde ${lateLike} geç/erken ayrılma` };

  return {
    totalRecords: rows.length,
    byStatus,
    recent: rows.slice(0, 6).map((r) => ({
      id: r.id,
      sessionDate: r.sessionDate,
      status: r.status,
      lessonTitle: r.lesson?.title ?? r.lesson?.subject ?? null,
    })),
    warning,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Homework summary
// ─────────────────────────────────────────────────────────────────────────────

export type ParentHomeworkRow = {
  assignmentId: string;
  title: string;
  dueAt: Date | null;
  submissionStatus: SubmissionStatus | "NONE";
  submittedAt: Date | null;
  score: number | null;
  maxScore: number | null;
  gradedAt: Date | null;
  operationalStatus: AssignmentOperationalStatus;
};

export type ParentHomeworkSummary = {
  activeCount: number;
  missingCount: number;
  ungradedCount: number;
  gradedCount: number;
  overdueCount: number;
  /** Sıralı: en yakın tarihli (geçmiş yok) */
  nextDue: ParentHomeworkRow | null;
  /** Son puanlanan ödevler (yeniden eskiye) */
  recentGraded: ParentHomeworkRow[];
};

export async function getParentHomeworkSummary(
  parentId: string,
  studentId: string,
): Promise<ParentHomeworkSummary> {
  if (!(await ownsStudent(parentId, studentId))) {
    return {
      activeCount: 0, missingCount: 0, ungradedCount: 0, gradedCount: 0, overdueCount: 0,
      nextDue: null, recentGraded: [],
    };
  }

  // Pull all assignments visible to this student (direct or classroom).
  // Limit to the last 60 days of activity to keep payload bounded.
  const since = daysAgo(60);
  const assignments = await prisma.assignment.findMany({
    where: {
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
      status: { in: ["PUBLISHED", "CLOSED"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      dueAt: true,
      maxScore: true,
      status: true,
      submissions: {
        where: { studentId },
        select: { id: true, status: true, submittedAt: true, score: true, gradedAt: true },
        take: 1,
      },
    },
  });

  const now = new Date();
  let activeCount = 0;
  let missingCount = 0;
  let ungradedCount = 0;
  let gradedCount = 0;
  let overdueCount = 0;
  const rows: ParentHomeworkRow[] = [];

  for (const a of assignments) {
    const sub = a.submissions[0];
    const subStatus: SubmissionStatus | "NONE" = sub ? sub.status : "NONE";

    // Per-student "expected = 1" tally for getAssignmentOperationalStatus.
    const tally = {
      expected: 1,
      pending: !sub || subStatus === "PENDING" ? 1 : 0,
      submitted: subStatus === "SUBMITTED" ? 1 : 0,
      graded: subStatus === "GRADED" ? 1 : 0,
      late: subStatus === "LATE" ? 1 : 0,
      missed: subStatus === "MISSED" ? 1 : 0,
    };
    const op = getAssignmentOperationalStatus(
      { status: a.status, dueAt: a.dueAt },
      tally,
      now,
    );

    const row: ParentHomeworkRow = {
      assignmentId: a.id,
      title: a.title,
      dueAt: a.dueAt,
      submissionStatus: subStatus,
      submittedAt: sub?.submittedAt ?? null,
      score: sub?.score ?? null,
      maxScore: a.maxScore ?? null,
      gradedAt: sub?.gradedAt ?? null,
      operationalStatus: op,
    };
    rows.push(row);

    const pastDue = !!a.dueAt && a.dueAt.getTime() < now.getTime();
    const isActive = a.status === "PUBLISHED";
    const isMissingForStudent =
      subStatus === "MISSED" || (pastDue && (!sub || subStatus === "PENDING"));
    if (isActive) activeCount++;
    if (isMissingForStudent) missingCount++;
    if (subStatus === "SUBMITTED") ungradedCount++;
    if (subStatus === "GRADED") gradedCount++;
    if (op === "OVERDUE") overdueCount++;
  }

  const nextDue = rows
    .filter((r) => r.dueAt && r.dueAt.getTime() >= now.getTime() && r.submissionStatus !== "GRADED")
    .sort((a, b) => (a.dueAt!.getTime() - b.dueAt!.getTime()))[0] ?? null;

  const recentGraded = rows
    .filter((r) => r.submissionStatus === "GRADED" && r.gradedAt)
    .sort((a, b) => b.gradedAt!.getTime() - a.gradedAt!.getTime())
    .slice(0, 5);

  return {
    activeCount, missingCount, ungradedCount, gradedCount, overdueCount,
    nextDue, recentGraded,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) Payment summary — best-effort with existing models
// ─────────────────────────────────────────────────────────────────────────────

export type ParentPaymentRow = {
  id: string;
  date: Date;
  packageName: string;
  status: "PAID" | "PENDING" | "FAILED" | "OTHER";
  amountKurus: number | null;
};

export type ParentPaymentSummary = {
  recentIntents: ParentPaymentRow[];
  recentPaidEntries: Array<{ id: string; occurredAt: Date; description: string | null; amountKurus: number; category: string }>;
  pendingIntentCount: number;
  /** Son 90 günde alınmış toplam ödeme (kuruş). Tahmini değil — gerçek INCOME kayıtları. */
  paidLast90DaysKurus: number;
  /**
   * "Vadesi gelen / geçen" konsepti veri modelinde yok. UI bu alanı
   * "deferred" işaretlemek için kullanır.
   */
  hasDueTracking: false;
};

export async function getParentPaymentSummary(
  parentId: string,
  studentId: string,
): Promise<ParentPaymentSummary> {
  if (!(await ownsStudent(parentId, studentId))) {
    return {
      recentIntents: [], recentPaidEntries: [],
      pendingIntentCount: 0, paidLast90DaysKurus: 0, hasDueTracking: false,
    };
  }
  const since = daysAgo(90);
  const [intents, entries, pendingCount] = await Promise.all([
    prisma.purchaseIntent.findMany({
      where: { studentId },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: { id: true, submittedAt: true, packageName: true, status: true },
    }),
    prisma.accountingEntry.findMany({
      where: { studentId, type: "INCOME", occurredAt: { gte: since } },
      orderBy: { occurredAt: "desc" },
      take: 5,
      select: { id: true, occurredAt: true, description: true, amount: true, category: true },
    }),
    prisma.purchaseIntent.count({
      where: { studentId, status: "PENDING" },
    }),
  ]);

  // Sum INCOME in window (separate query keeps types simple; small N).
  const allIncome = await prisma.accountingEntry.findMany({
    where: { studentId, type: "INCOME", occurredAt: { gte: since } },
    select: { amount: true },
  });
  const paidLast90DaysKurus = allIncome.reduce((s, e) => s + e.amount, 0);

  return {
    recentIntents: intents.map((i) => ({
      id: i.id,
      date: i.submittedAt,
      packageName: i.packageName,
      status:
        i.status === "PAID" ? "PAID"
          : i.status === "PENDING" ? "PENDING"
          : i.status === "FAILED" ? "FAILED"
          : "OTHER",
      amountKurus: null, // PurchaseIntent doesn't store final amount
    })),
    recentPaidEntries: entries.map((e) => ({
      id: e.id,
      occurredAt: e.occurredAt,
      description: e.description,
      amountKurus: e.amount,
      category: e.category,
    })),
    pendingIntentCount: pendingCount,
    paidLast90DaysKurus,
    hasDueTracking: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) ODK snapshot
// ─────────────────────────────────────────────────────────────────────────────

export type ParentOdkAttempt = {
  id: string;
  examTitle: string;
  submittedAt: Date | null;
  net: number | null;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  durationSeconds: number | null;
};

export type ParentOdkSnapshot = {
  hasUserLink: boolean;
  totalSubmitted: number;
  averageNet: number | null;
  recent: ParentOdkAttempt[];
};

export async function getParentOdkSnapshot(
  parentId: string,
  studentId: string,
  studentUserId: string | null,
): Promise<ParentOdkSnapshot> {
  if (!(await ownsStudent(parentId, studentId))) {
    return { hasUserLink: false, totalSubmitted: 0, averageNet: null, recent: [] };
  }
  if (!studentUserId) {
    return { hasUserLink: false, totalSubmitted: 0, averageNet: null, recent: [] };
  }

  const [recent, totalSubmitted] = await Promise.all([
    prisma.odkExamAttempt.findMany({
      where: { userId: studentUserId, status: "SUBMITTED" },
      orderBy: { submittedAt: "desc" },
      take: 5,
      select: {
        id: true,
        submittedAt: true,
        correctCount: true,
        wrongCount: true,
        blankCount: true,
        durationSeconds: true,
        exam: { select: { title: true } },
      },
    }),
    prisma.odkExamAttempt.count({
      where: { userId: studentUserId, status: "SUBMITTED" },
    }),
  ]);

  const rows: ParentOdkAttempt[] = recent.map((a) => ({
    id: a.id,
    examTitle: a.exam?.title ?? "ODK",
    submittedAt: a.submittedAt,
    net: Math.round((a.correctCount - a.wrongCount / 4) * 100) / 100,
    correctCount: a.correctCount,
    wrongCount: a.wrongCount,
    blankCount: a.blankCount,
    durationSeconds: a.durationSeconds,
  }));
  const validNets = rows.map((r) => r.net).filter((n): n is number => n != null);
  const averageNet = validNets.length
    ? Math.round((validNets.reduce((s, n) => s + n, 0) / validNets.length) * 100) / 100
    : null;

  return {
    hasUserLink: true,
    totalSubmitted,
    averageNet,
    recent: rows,
  };
}
