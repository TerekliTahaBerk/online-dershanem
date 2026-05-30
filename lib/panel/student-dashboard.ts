/**
 * Student dashboard query helpers — Phase 2 / Session 4.
 *
 * Student-scoped data layer for `/panel/ogrenci`. Every helper takes
 * `studentId` and queries only that student's data. The route layer
 * (`requireStudent()` in `lib/panel-student.ts`) is the auth gate; these
 * helpers do not re-verify because student auth is rooted in `userId →
 * Student` rather than URL params, so there is no cross-student URL to
 * forge. Server actions that mutate a `StudySession` MUST still verify
 * `session.studentId === student.id` before write — those are in
 * `app/panel/ogrenci/calisma-odasi/_actions.ts`.
 *
 * Notes on the data model:
 *   - Lessons & Assignments fan out via classroom membership
 *     (`leftAt: null`), exact same pattern as parent helpers.
 *   - ODK is keyed on `User.id`, not `Student.id`; helpers fall back to
 *     empty when the student has no linked user.
 *   - StudySession is additive (migration 0029); the operational
 *     invariant "at most one open session per student" is enforced in
 *     the action layer.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import {
  getAssignmentOperationalStatus,
  type AssignmentOperationalStatus,
} from "@/lib/homework";

// ─────────────────────────────────────────────────────────────────────────────
// Date math
// ─────────────────────────────────────────────────────────────────────────────

function startOfDay(d = new Date()): Date {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function endOfDay(d = new Date()): Date {
  const x = new Date(d); x.setHours(23, 59, 59, 999); return x;
}
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}
function daysAhead(n: number): Date {
  return new Date(Date.now() + n * 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Next lesson hero — "Sıradaki dersin"
// ─────────────────────────────────────────────────────────────────────────────

export type StudentNextLesson = {
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
  /** "live now" — current time within [scheduledAt, scheduledAt+duration) */
  isLiveNow: boolean;
  /** "starting soon" — within next 15 min */
  isStartingSoon: boolean;
};

export async function getStudentNextLesson(
  studentId: string,
): Promise<StudentNextLesson | null> {
  const now = new Date();
  // Look back 30 minutes so an in-progress lesson still surfaces.
  const lookback = new Date(now.getTime() - 30 * 60_000);

  const lesson = await prisma.lesson.findFirst({
    where: {
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
      scheduledAt: { gte: lookback },
      status: { in: ["SCHEDULED", "LIVE", "ENDED"] },
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
  if (!lesson) return null;

  const startMs = lesson.scheduledAt.getTime();
  const endMs = startMs + lesson.duration * 60_000;
  const nowMs = now.getTime();
  return {
    id: lesson.id,
    scheduledAt: lesson.scheduledAt,
    duration: lesson.duration,
    title: lesson.title,
    subject: lesson.subject,
    status: lesson.status,
    classroomName: lesson.classroom?.name ?? null,
    teacherName: lesson.teacher?.fullName ?? null,
    meetingJoinUrl: lesson.meetingJoinUrl,
    googleMeetLink: lesson.googleMeetLink,
    isLiveNow: nowMs >= startMs && nowMs < endMs,
    isStartingSoon: nowMs < startMs && startMs - nowMs <= 15 * 60_000,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) Today checklist — actionable, deduplicated bullets
// ─────────────────────────────────────────────────────────────────────────────

export type StudentChecklistItemKind =
  | "LESSON_TODAY"
  | "HOMEWORK_DUE_TODAY"
  | "HOMEWORK_OVERDUE"
  | "EXAM_TODAY";

export type StudentChecklistItem = {
  id: string;
  kind: StudentChecklistItemKind;
  /** Sıralama anahtarı */
  occurredAt: Date;
  timeLabel: string | null;
  message: string;
  href: string | null;
  /** Çocuk-merkezli ton: "ok" pozitif, "warn" hatırlatma, "bad" kaçırılan */
  tone: "ok" | "warn" | "bad" | "neutral" | "accent";
  /** Kullanıcı tamamladı işareti (ilerideki kullanıcı tarafında "checked" stili). */
  done: boolean;
};

export async function getStudentTodayChecklist(
  studentId: string,
  studentUserId: string | null,
): Promise<StudentChecklistItem[]> {
  const now = new Date();
  const dayStart = startOfDay();
  const dayEnd = endOfDay();
  const fmtTime = (d: Date) =>
    new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(d);

  const [lessonsToday, dueToday, overdue, examsToday] = await Promise.all([
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
        id: true, scheduledAt: true, title: true, subject: true, status: true,
      },
    }),
    prisma.assignment.findMany({
      where: {
        OR: [
          { studentId },
          { classroom: { students: { some: { studentId, leftAt: null } } } },
        ],
        status: "PUBLISHED",
        dueAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { dueAt: "asc" },
      select: {
        id: true, title: true, dueAt: true,
        submissions: {
          where: { studentId },
          select: { status: true, submittedAt: true },
          take: 1,
        },
      },
    }),
    prisma.assignment.findMany({
      where: {
        OR: [
          { studentId },
          { classroom: { students: { some: { studentId, leftAt: null } } } },
        ],
        status: "PUBLISHED",
        dueAt: { lt: dayStart, gte: daysAgo(30) },
      },
      orderBy: { dueAt: "desc" },
      take: 8,
      select: {
        id: true, title: true, dueAt: true,
        submissions: {
          where: { studentId },
          select: { status: true, submittedAt: true },
          take: 1,
        },
      },
    }),
    studentUserId
      ? prisma.odkExamAttempt.findMany({
          where: {
            userId: studentUserId,
            status: "IN_PROGRESS",
            startedAt: { gte: daysAgo(2) },
          },
          orderBy: { startedAt: "desc" },
          take: 3,
          select: {
            id: true, startedAt: true, exam: { select: { title: true } },
          },
        })
      : Promise.resolve([] as { id: string; startedAt: Date; exam: { title: string } | null }[]),
  ]);

  const items: StudentChecklistItem[] = [];

  for (const l of lessonsToday) {
    const done = l.status === "COMPLETED" || l.status === "ENDED";
    const cancelled = l.status === "CANCELLED" || l.status === "MISSED";
    items.push({
      id: `lesson:${l.id}`,
      kind: "LESSON_TODAY",
      occurredAt: l.scheduledAt,
      timeLabel: fmtTime(l.scheduledAt),
      message: `${l.title ?? l.subject ?? "Ders"}${
        l.status === "LIVE" ? " · canlı" : ""
      }${cancelled ? " · iptal" : ""}`,
      href: "/panel/ogrenci/ders-programi",
      tone: cancelled ? "bad" : l.status === "LIVE" ? "accent" : "neutral",
      done,
    });
  }

  for (const a of dueToday) {
    const sub = a.submissions[0];
    const done = !!sub && (sub.status === "SUBMITTED" || sub.status === "GRADED" || sub.status === "LATE");
    items.push({
      id: `due:${a.id}`,
      kind: "HOMEWORK_DUE_TODAY",
      occurredAt: a.dueAt ?? now,
      timeLabel: a.dueAt ? fmtTime(a.dueAt) : null,
      message: `Bugün son: ${a.title}`,
      href: `/panel/ogrenci/odevler`,
      tone: done ? "ok" : "warn",
      done,
    });
  }

  for (const a of overdue) {
    const sub = a.submissions[0];
    const done = !!sub && (sub.status === "SUBMITTED" || sub.status === "GRADED" || sub.status === "LATE");
    if (done) continue; // sadece açıkta kalanlar
    items.push({
      id: `over:${a.id}`,
      kind: "HOMEWORK_OVERDUE",
      occurredAt: a.dueAt ?? now,
      timeLabel: null,
      message: `Geciken ödev: ${a.title}`,
      href: `/panel/ogrenci/odevler`,
      tone: "bad",
      done: false,
    });
  }

  for (const e of examsToday) {
    items.push({
      id: `exam:${e.id}`,
      kind: "EXAM_TODAY",
      occurredAt: e.startedAt,
      timeLabel: fmtTime(e.startedAt),
      message: `Yarım kalmış deneme: ${e.exam?.title ?? "ODK"}`,
      href: "/panel/ogrenci/odk/denemeler",
      tone: "warn",
      done: false,
    });
  }

  items.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Homework focus — bekleyen + son puanlanan
// ─────────────────────────────────────────────────────────────────────────────

export type StudentHomeworkRow = {
  assignmentId: string;
  title: string;
  dueAt: Date | null;
  submissionStatus: string;
  submittedAt: Date | null;
  score: number | null;
  maxScore: number | null;
  gradedAt: Date | null;
  operationalStatus: AssignmentOperationalStatus;
};

export type StudentHomeworkFocus = {
  pendingCount: number;
  overdueCount: number;
  awaitingGradeCount: number;
  recentGradedCount: number;
  /** Vadesi en yakın olan açık ödev */
  nextDue: StudentHomeworkRow | null;
  /** En çok 4 açık ödev (vadesine göre artan) */
  pending: StudentHomeworkRow[];
  /** Son puanlanan 3 ödev */
  recentGraded: StudentHomeworkRow[];
};

export async function getStudentHomeworkFocus(
  studentId: string,
): Promise<StudentHomeworkFocus> {
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
      id: true, title: true, dueAt: true, maxScore: true, status: true,
      submissions: {
        where: { studentId },
        select: { id: true, status: true, submittedAt: true, score: true, gradedAt: true },
        take: 1,
      },
    },
  });

  const now = new Date();
  const rows: StudentHomeworkRow[] = [];
  let pendingCount = 0;
  let overdueCount = 0;
  let awaitingGradeCount = 0;
  let recentGradedCount = 0;

  for (const a of assignments) {
    const sub = a.submissions[0];
    const subStatus = (sub?.status ?? "NONE") as string;
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
    const row: StudentHomeworkRow = {
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
    const isOpenForStudent = !sub || subStatus === "PENDING";
    if (a.status === "PUBLISHED" && isOpenForStudent && !pastDue) pendingCount++;
    if (a.status === "PUBLISHED" && isOpenForStudent && pastDue) overdueCount++;
    if (subStatus === "SUBMITTED") awaitingGradeCount++;
    if (subStatus === "GRADED") recentGradedCount++;
  }

  const pending = rows
    .filter((r) =>
      (r.submissionStatus === "NONE" || r.submissionStatus === "PENDING") &&
      r.dueAt !== null &&
      r.dueAt.getTime() >= now.getTime(),
    )
    .sort((a, b) => (a.dueAt!.getTime() - b.dueAt!.getTime()))
    .slice(0, 4);

  const nextDue = pending[0] ?? null;

  const recentGraded = rows
    .filter((r) => r.submissionStatus === "GRADED" && r.gradedAt)
    .sort((a, b) => b.gradedAt!.getTime() - a.gradedAt!.getTime())
    .slice(0, 3);

  return {
    pendingCount, overdueCount, awaitingGradeCount, recentGradedCount,
    nextDue, pending, recentGraded,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Attendance snapshot (last 30 days)
// ─────────────────────────────────────────────────────────────────────────────

export type StudentAttendanceSnapshot = {
  totalRecords: number;
  byStatus: Record<string, number>;
  presentRate: number | null; // 0..1
  recent: Array<{ id: string; sessionDate: Date; status: string; lessonTitle: string | null }>;
};

export async function getStudentAttendanceSnapshot(
  studentId: string,
): Promise<StudentAttendanceSnapshot> {
  const since = daysAgo(30);
  const rows = await prisma.attendance.findMany({
    where: { studentId, sessionDate: { gte: since } },
    orderBy: { sessionDate: "desc" },
    select: {
      id: true, sessionDate: true, status: true,
      lesson: { select: { title: true, subject: true } },
    },
  });

  const byStatus: Record<string, number> = {
    PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, LEFT_EARLY: 0,
  };
  for (const r of rows) {
    const s = r.status as string;
    byStatus[s] = (byStatus[s] ?? 0) + 1;
  }
  const total = rows.length;
  const present = byStatus.PRESENT + byStatus.LATE + byStatus.LEFT_EARLY;
  const presentRate = total > 0 ? present / total : null;

  return {
    totalRecords: total,
    byStatus,
    presentRate,
    recent: rows.slice(0, 5).map((r) => ({
      id: r.id,
      sessionDate: r.sessionDate,
      status: r.status as string,
      lessonTitle: r.lesson?.title ?? r.lesson?.subject ?? null,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Recent results — denemeler (StudentExamResult + ODK)
// ─────────────────────────────────────────────────────────────────────────────

export type StudentRecentResult = {
  id: string;
  source: "EXAM_RESULT" | "ODK";
  title: string;
  takenAt: Date;
  net: number | null;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  href: string | null;
};

export async function getStudentRecentResults(
  studentId: string,
  studentUserId: string | null,
): Promise<{ items: StudentRecentResult[]; averageNet: number | null }> {
  const [examResults, odkAttempts] = await Promise.all([
    prisma.studentExamResult.findMany({
      where: { studentId },
      orderBy: { takenAt: "desc" },
      take: 5,
      select: {
        id: true, title: true, takenAt: true, net: true,
        correctCount: true, wrongCount: true, blankCount: true,
      },
    }),
    studentUserId
      ? prisma.odkExamAttempt.findMany({
          where: { userId: studentUserId, status: "SUBMITTED" },
          orderBy: { submittedAt: "desc" },
          take: 5,
          select: {
            id: true, submittedAt: true,
            correctCount: true, wrongCount: true, blankCount: true,
            exam: { select: { title: true } },
          },
        })
      : Promise.resolve([] as Array<{
          id: string;
          submittedAt: Date | null;
          correctCount: number;
          wrongCount: number;
          blankCount: number;
          exam: { title: string } | null;
        }>),
  ]);

  const items: StudentRecentResult[] = [];

  for (const r of examResults) {
    items.push({
      id: `exam:${r.id}`,
      source: "EXAM_RESULT",
      title: r.title,
      takenAt: r.takenAt,
      net: r.net != null ? Number(r.net) : null,
      correctCount: r.correctCount,
      wrongCount: r.wrongCount,
      blankCount: r.blankCount,
      href: "/panel/ogrenci/performansim",
    });
  }
  for (const a of odkAttempts) {
    if (!a.submittedAt) continue;
    const net = Math.round((a.correctCount - a.wrongCount / 4) * 100) / 100;
    items.push({
      id: `odk:${a.id}`,
      source: "ODK",
      title: a.exam?.title ?? "ODK Denemesi",
      takenAt: a.submittedAt,
      net,
      correctCount: a.correctCount,
      wrongCount: a.wrongCount,
      blankCount: a.blankCount,
      href: `/panel/ogrenci/odk/sonuc/${a.id}`,
    });
  }
  items.sort((a, b) => b.takenAt.getTime() - a.takenAt.getTime());
  const top = items.slice(0, 6);

  const validNets = top.map((i) => i.net).filter((n): n is number => n != null);
  const averageNet = validNets.length
    ? Math.round((validNets.reduce((s, n) => s + n, 0) / validNets.length) * 100) / 100
    : null;

  return { items: top, averageNet };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) Suggested focus — operational, not gamified
// ─────────────────────────────────────────────────────────────────────────────

export type StudentSuggestedFocusItem = {
  id: string;
  /** Ders/konu adı */
  subject: string;
  /** Kaynağın kısa açıklaması */
  reason: string;
  /** "warn" = dikkat, "bad" = öncelikli, "ok" = güçlü yön */
  tone: "warn" | "bad" | "ok" | "neutral";
  /** Tıklanabilir hedef */
  href: string | null;
};

/**
 * Operational focus suggestions, derived from real data only:
 *   - Student.weakLessons (admin/öğretmen tarafından girilmiş zayıf konular)
 *   - Student.strongLessons (güçlü konular — pozitif tonla)
 *   - Son denemelerin subjectStats üzerinden en düşük net 2 ders
 * Hiçbir noktada uydurma "skor" üretmiyoruz.
 */
export async function getStudentSuggestedFocus(
  studentId: string,
): Promise<StudentSuggestedFocusItem[]> {
  const [student, lastResult] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { weakLessons: true, strongLessons: true, targetGoal: true },
    }),
    prisma.studentExamResult.findFirst({
      where: { studentId },
      orderBy: { takenAt: "desc" },
      include: {
        subjectStats: {
          select: { subject: true, net: true, correctCount: true, wrongCount: true },
        },
      },
    }),
  ]);

  const items: StudentSuggestedFocusItem[] = [];
  const seen = new Set<string>();

  // Weak lessons — virgül ayraçlı serbest metin alanları.
  if (student?.weakLessons) {
    for (const raw of student.weakLessons.split(/[,;]+/)) {
      const subject = raw.trim();
      if (!subject || seen.has(subject.toLowerCase())) continue;
      seen.add(subject.toLowerCase());
      items.push({
        id: `weak:${subject}`,
        subject,
        reason: "Zayıf yön olarak işaretlendi",
        tone: "bad",
        href: "/panel/ogrenci/performansim",
      });
      if (items.length >= 4) break;
    }
  }

  // Subject stats from last exam — pick lowest two nets that aren't already in.
  if (lastResult?.subjectStats?.length) {
    const sorted = [...lastResult.subjectStats]
      .filter((s) => s.subject)
      .sort((a, b) => Number(a.net ?? 0) - Number(b.net ?? 0));
    for (const s of sorted) {
      const subject = (s.subject ?? "").trim();
      if (!subject || seen.has(subject.toLowerCase())) continue;
      seen.add(subject.toLowerCase());
      items.push({
        id: `stat:${subject}`,
        subject,
        reason: `Son denemede net ${Number(s.net ?? 0)}`,
        tone: "warn",
        href: "/panel/ogrenci/performansim",
      });
      if (items.length >= 5) break;
    }
  }

  // Strong lessons — pozitif "ok" sinyali (1 tane).
  if (student?.strongLessons) {
    for (const raw of student.strongLessons.split(/[,;]+/)) {
      const subject = raw.trim();
      if (!subject || seen.has(subject.toLowerCase())) continue;
      seen.add(subject.toLowerCase());
      items.push({
        id: `strong:${subject}`,
        subject,
        reason: "Güçlü olduğun ders — formu koru",
        tone: "ok",
        href: "/panel/ogrenci/performansim",
      });
      break;
    }
  }

  return items;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) Study session helpers — Study Room
// ─────────────────────────────────────────────────────────────────────────────

export type StudyDailyBucket = {
  /** YYYY-MM-DD (yerel) */
  day: string;
  totalSeconds: number;
};

export type StudyActiveSession = {
  id: string;
  startedAt: Date;
  courseId: string | null;
  courseTitle: string | null;
  subject: string | null;
  note: string | null;
};

export type StudyRecentSession = {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number | null;
  subject: string | null;
  courseTitle: string | null;
  note: string | null;
};

export type StudentStudySummary = {
  active: StudyActiveSession | null;
  /** Son 7 günün gün-bazlı toplamı (eski → yeni) */
  last7Days: StudyDailyBucket[];
  /** Son 7 günün toplam saniyesi */
  totalSecondsLast7: number;
  /** Bugünün toplam saniyesi (aktif oturumun anlık geçen süresi dahil) */
  todaySeconds: number;
  /** Son 5 oturum */
  recent: StudyRecentSession[];
};

export async function getStudentStudySummary(
  studentId: string,
): Promise<StudentStudySummary> {
  const since = daysAgo(7);
  const dayStart = startOfDay();

  const [active, completed, todayCompleted, recent] = await Promise.all([
    prisma.studySession.findFirst({
      where: { studentId, endedAt: null },
      orderBy: { startedAt: "desc" },
      select: {
        id: true, startedAt: true, courseId: true, subject: true, note: true,
        course: { select: { title: true } },
      },
    }),
    prisma.studySession.findMany({
      where: {
        studentId,
        endedAt: { not: null },
        startedAt: { gte: since },
      },
      select: { startedAt: true, durationSeconds: true },
    }),
    prisma.studySession.findMany({
      where: {
        studentId,
        endedAt: { not: null },
        startedAt: { gte: dayStart },
      },
      select: { durationSeconds: true },
    }),
    prisma.studySession.findMany({
      where: { studentId, endedAt: { not: null } },
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true, startedAt: true, endedAt: true, durationSeconds: true,
        subject: true, note: true,
        course: { select: { title: true } },
      },
    }),
  ]);

  // Bucket by local YYYY-MM-DD.
  const buckets = new Map<string, number>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, 0);
  }
  for (const c of completed) {
    const key = startOfDay(c.startedAt).toISOString().slice(0, 10);
    if (!buckets.has(key)) continue;
    buckets.set(key, (buckets.get(key) ?? 0) + (c.durationSeconds ?? 0));
  }

  const last7Days: StudyDailyBucket[] = Array.from(buckets.entries()).map(
    ([day, totalSeconds]) => ({ day, totalSeconds }),
  );
  const totalSecondsLast7 = last7Days.reduce((s, b) => s + b.totalSeconds, 0);

  let todaySeconds = todayCompleted.reduce(
    (s, c) => s + (c.durationSeconds ?? 0), 0,
  );
  if (active && active.startedAt.getTime() >= dayStart.getTime()) {
    todaySeconds += Math.max(
      0,
      Math.floor((Date.now() - active.startedAt.getTime()) / 1000),
    );
  }

  return {
    active: active
      ? {
          id: active.id,
          startedAt: active.startedAt,
          courseId: active.courseId,
          courseTitle: active.course?.title ?? null,
          subject: active.subject,
          note: active.note,
        }
      : null,
    last7Days,
    totalSecondsLast7,
    todaySeconds,
    recent: recent.map((r) => ({
      id: r.id,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      durationSeconds: r.durationSeconds,
      subject: r.subject,
      courseTitle: r.course?.title ?? null,
      note: r.note,
    })),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) Course options for the Study Room dropdown
// ─────────────────────────────────────────────────────────────────────────────

export type StudentCourseOption = {
  id: string;
  title: string;
  subject: string;
};

export async function getStudentCourseOptions(
  studentId: string,
): Promise<StudentCourseOption[]> {
  // Courses linked to the student's active classrooms (Lesson.classroom)
  // OR direct lessons. Distinct, alphabetized.
  const lessons = await prisma.lesson.findMany({
    where: {
      OR: [
        { studentId },
        { classroom: { students: { some: { studentId, leftAt: null } } } },
      ],
      courseId: { not: null },
      scheduledAt: { gte: daysAhead(-90) },
    },
    select: {
      course: { select: { id: true, title: true, subject: true, isActive: true } },
    },
    take: 200,
  });

  const map = new Map<string, StudentCourseOption>();
  for (const l of lessons) {
    if (!l.course || l.course.isActive === false) continue;
    if (map.has(l.course.id)) continue;
    map.set(l.course.id, {
      id: l.course.id,
      title: l.course.title,
      subject: l.course.subject,
    });
  }
  return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title, "tr"));
}

// ─────────────────────────────────────────────────────────────────────────────
// Format helpers (re-exported for components)
// ─────────────────────────────────────────────────────────────────────────────

export function formatStudyDuration(seconds: number): string {
  if (!seconds || seconds < 1) return "0 dk";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h} sa ${m} dk`;
  if (h > 0) return `${h} sa`;
  return `${Math.max(1, m)} dk`;
}
