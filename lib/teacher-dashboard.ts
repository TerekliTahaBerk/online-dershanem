/**
 * Teacher dashboard server-side query helpers — Phase 2 / Session 1.
 *
 * Every helper is **strictly scoped to a teacherId**. They are pure data
 * loaders for `app/panel/ogretmen/page.tsx` and the components beneath it.
 *
 * Permissions contract:
 *   - Caller MUST pass the resolved Teacher.id from `requireTeacher()`.
 *   - Helpers never accept `userId` directly to avoid leaking other teachers'
 *     data through join-side queries.
 *   - All filters key on `teacherId` (Lesson.teacherId, Assignment.teacherId,
 *     ClassroomTeacher.teacherId).
 *
 * Date semantics:
 *   - "Today" = local server time `[startOfDay, endOfDay]`. The DB is UTC but
 *     `Date` math here is wall-clock; this matches how every other panel
 *     page formats dates (no timezone helper exists in `lib/`).
 *   - "Last 30 days" = `now - 30*86400000` … `now`.
 *   - "Upcoming week" = `now` … `now + 7*86400000`.
 */

import { prisma } from "@/lib/prisma";
import {
  getAssignmentOperationalStatus,
  type AssignmentOperationalStatus,
} from "@/lib/homework";
import type { LessonStatus, AttendanceStatus } from "@prisma/client";

// ────────────────────────────────────────────────────────────────────────────
// Date helpers (local wall-clock, no TZ library — matches the rest of /panel)
// ────────────────────────────────────────────────────────────────────────────

function startOfDay(d: Date = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date = new Date()): Date {
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

// ────────────────────────────────────────────────────────────────────────────
// 1) getTeacherTodayLessons
// ────────────────────────────────────────────────────────────────────────────

export type TeacherTodayLesson = {
  id: string;
  scheduledAt: Date;
  duration: number;
  title: string | null;
  subject: string | null;
  status: LessonStatus;
  meetingJoinUrl: string | null;
  googleMeetLink: string | null;
  classroomName: string | null;
  classroomId: string | null;
  courseName: string | null;
  studentName: string;
  studentId: string;
  attendanceTaken: boolean;
};

/**
 * Returns today's lessons for a teacher, ordered by start time.
 * One row per Lesson (Lesson is fan-out per student, so a classroom session
 * shows up once per enrolled student — that's intentional for the timeline).
 */
export async function getTeacherTodayLessons(teacherId: string): Promise<TeacherTodayLesson[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      scheduledAt: { gte: startOfDay(), lte: endOfDay() },
    },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      scheduledAt: true,
      duration: true,
      title: true,
      subject: true,
      status: true,
      meetingJoinUrl: true,
      googleMeetLink: true,
      classroomId: true,
      classroom: { select: { name: true } },
      course: { select: { title: true } },
      student: { select: { id: true, fullName: true } },
      attendances: { select: { id: true }, take: 1 },
    },
  });

  return lessons.map((l) => ({
    id: l.id,
    scheduledAt: l.scheduledAt,
    duration: l.duration,
    title: l.title,
    subject: l.subject,
    status: l.status,
    meetingJoinUrl: l.meetingJoinUrl,
    googleMeetLink: l.googleMeetLink,
    classroomName: l.classroom?.name ?? null,
    classroomId: l.classroomId,
    courseName: l.course?.title ?? null,
    studentName: l.student.fullName,
    studentId: l.student.id,
    attendanceTaken: l.attendances.length > 0,
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// 2) getTeacherPendingAttendance
// ────────────────────────────────────────────────────────────────────────────

export type TeacherPendingAttendanceRow = {
  lessonId: string;
  scheduledAt: Date;
  title: string;
  subject: string | null;
  classroomName: string | null;
  classroomId: string | null;
  studentCount: number;
  status: LessonStatus;
};

/**
 * Lessons in the last 14 days that have NO attendance recorded yet. Past-tense
 * only — today's lessons are surfaced by the today timeline.
 *
 * For classroom-grouped sessions (same classroomId + same scheduledAt minute),
 * we collapse fan-out rows so the teacher sees one entry per session, not one
 * per enrolled student.
 */
export async function getTeacherPendingAttendance(
  teacherId: string,
  limit = 20,
): Promise<TeacherPendingAttendanceRow[]> {
  const since = daysAgo(14);
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      scheduledAt: { gte: since, lt: startOfDay() },
      status: { in: ["SCHEDULED", "LIVE", "ENDED", "COMPLETED"] satisfies LessonStatus[] },
      attendances: { none: {} },
    },
    orderBy: { scheduledAt: "desc" },
    select: {
      id: true,
      scheduledAt: true,
      title: true,
      subject: true,
      status: true,
      classroomId: true,
      classroom: { select: { name: true } },
    },
    take: limit * 4, // over-fetch, then collapse
  });

  // Collapse fan-out by (classroomId, scheduledAt minute).
  type Bucket = TeacherPendingAttendanceRow & { _key: string };
  const map = new Map<string, Bucket>();
  for (const l of lessons) {
    const key = l.classroomId
      ? `c:${l.classroomId}:${Math.floor(l.scheduledAt.getTime() / 60000)}`
      : `l:${l.id}`;
    const existing = map.get(key);
    if (existing) {
      existing.studentCount += 1;
      continue;
    }
    map.set(key, {
      _key: key,
      lessonId: l.id,
      scheduledAt: l.scheduledAt,
      title: l.title ?? l.subject ?? l.classroom?.name ?? "Ders",
      subject: l.subject,
      classroomName: l.classroom?.name ?? null,
      classroomId: l.classroomId,
      studentCount: 1,
      status: l.status,
    });
  }
  return Array.from(map.values()).slice(0, limit).map((b) => {
    const { _key, ...row } = b;
    void _key;
    return row;
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 3) getTeacherHomeworkReviewQueue
// ────────────────────────────────────────────────────────────────────────────

export type TeacherHomeworkReviewRow = {
  assignmentId: string;
  title: string;
  classroomName: string | null;
  dueAt: Date | null;
  expected: number;
  submittedCount: number;
  ungradedCount: number;
  operationalStatus: AssignmentOperationalStatus;
};

/**
 * Assignments with at least one submission that needs grading. Sorted with
 * AWAITING_GRADING first, then OVERDUE, then by dueAt.
 */
export async function getTeacherHomeworkReviewQueue(
  teacherId: string,
  limit = 12,
): Promise<TeacherHomeworkReviewRow[]> {
  const assignments = await prisma.assignment.findMany({
    where: {
      teacherId,
      status: { in: ["PUBLISHED", "CLOSED"] },
    },
    orderBy: { updatedAt: "desc" },
    take: 60,
    select: {
      id: true,
      title: true,
      dueAt: true,
      status: true,
      classroom: { select: { name: true } },
      submissions: {
        select: { status: true, gradedAt: true },
      },
    },
  });

  const now = new Date();
  const rows: TeacherHomeworkReviewRow[] = [];
  for (const a of assignments) {
    let pending = 0, submitted = 0, graded = 0, late = 0, missed = 0;
    let ungraded = 0;
    for (const s of a.submissions) {
      switch (s.status) {
        case "PENDING": pending++; break;
        case "SUBMITTED": submitted++; if (!s.gradedAt) ungraded++; break;
        case "GRADED": graded++; break;
        case "LATE": late++; if (!s.gradedAt) ungraded++; break;
        case "MISSED": missed++; break;
      }
    }
    const expected = a.submissions.length;
    const op = getAssignmentOperationalStatus(
      { status: a.status, dueAt: a.dueAt },
      { expected, pending, submitted, graded, late, missed },
      now,
    );
    // Only show items the teacher can actually act on:
    //   - AWAITING_GRADING / PARTIALLY_GRADED  → ungraded > 0
    //   - OVERDUE with submissions to review
    if (ungraded > 0 || op === "OVERDUE" || op === "AWAITING_GRADING" || op === "PARTIALLY_GRADED") {
      rows.push({
        assignmentId: a.id,
        title: a.title,
        classroomName: a.classroom?.name ?? null,
        dueAt: a.dueAt,
        expected,
        submittedCount: submitted + late,
        ungradedCount: ungraded,
        operationalStatus: op,
      });
    }
  }

  const order: AssignmentOperationalStatus[] = [
    "AWAITING_GRADING",
    "PARTIALLY_GRADED",
    "OVERDUE",
    "AWAITING_SUBMISSION",
    "PUBLISHED",
    "COMPLETED",
    "ARCHIVED",
    "DRAFT",
  ];
  rows.sort((a, b) => {
    const oa = order.indexOf(a.operationalStatus);
    const ob = order.indexOf(b.operationalStatus);
    if (oa !== ob) return oa - ob;
    const da = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const db = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  return rows.slice(0, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// 4) getTeacherClassesOverview
// ────────────────────────────────────────────────────────────────────────────

export type TeacherClassRow = {
  classroomId: string;
  name: string;
  branch: string | null;
  studentCount: number;
  upcomingLessonCount: number;
  attendanceRiskCount: number;     // students with ≥2 ABSENT in last 30d
  missingHomeworkCount: number;    // submissions with status MISSED in last 30d
  isLead: boolean;
  subject: string | null;
};

export async function getTeacherClassesOverview(teacherId: string): Promise<TeacherClassRow[]> {
  const links = await prisma.classroomTeacher.findMany({
    where: { teacherId, classroom: { isActive: true } },
    select: {
      isLead: true,
      subject: true,
      classroom: {
        select: {
          id: true,
          name: true,
          branch: true,
          _count: { select: { students: { where: { leftAt: null } } } },
        },
      },
    },
  });
  if (links.length === 0) return [];

  const classroomIds = links.map((l) => l.classroom.id);
  const since = daysAgo(30);
  const upcomingTo = daysAhead(7);

  const [upcomingByClass, riskByClass, missingByClass] = await Promise.all([
    prisma.lesson.groupBy({
      by: ["classroomId"],
      where: {
        teacherId,
        classroomId: { in: classroomIds },
        scheduledAt: { gte: new Date(), lte: upcomingTo },
        status: { in: ["SCHEDULED", "LIVE"] satisfies LessonStatus[] },
      },
      _count: { _all: true },
    }),
    // Students with ≥2 ABSENT in last 30d, grouped by classroom.
    // We pull (studentId, classroomId) pairs from attendance keyed to
    // attendance.classroomId (matches CLASSROOM_SESSION) OR via lesson.
    prisma.attendance.findMany({
      where: {
        sessionDate: { gte: since },
        status: "ABSENT" satisfies AttendanceStatus,
        OR: [
          { classroomId: { in: classroomIds } },
          { lesson: { classroomId: { in: classroomIds }, teacherId } },
        ],
      },
      select: {
        studentId: true,
        classroomId: true,
        lesson: { select: { classroomId: true } },
      },
    }),
    prisma.assignmentSubmission.groupBy({
      by: ["assignmentId"],
      where: {
        status: "MISSED",
        createdAt: { gte: since },
        assignment: { teacherId, classroomId: { in: classroomIds } },
      },
      _count: { _all: true },
    }),
  ]);

  // Tally absence counts per (studentId, classroomId)
  const absenceCounts = new Map<string, Map<string, number>>(); // classroomId → studentId → count
  for (const a of riskByClass) {
    const cid = a.classroomId ?? a.lesson?.classroomId ?? null;
    if (!cid) continue;
    let inner = absenceCounts.get(cid);
    if (!inner) { inner = new Map(); absenceCounts.set(cid, inner); }
    inner.set(a.studentId, (inner.get(a.studentId) ?? 0) + 1);
  }
  const riskCount = (cid: string) => {
    const inner = absenceCounts.get(cid);
    if (!inner) return 0;
    let n = 0;
    for (const c of inner.values()) if (c >= 2) n++;
    return n;
  };

  // Sum MISSED submissions per classroom (we grouped by assignmentId, need to
  // map back to classroomId via assignment lookup).
  let missingPerClassroom = new Map<string, number>();
  if (missingByClass.length > 0) {
    const aIds = missingByClass.map((m) => m.assignmentId);
    const aMap = await prisma.assignment.findMany({
      where: { id: { in: aIds } },
      select: { id: true, classroomId: true },
    });
    const aToC = new Map(aMap.map((a) => [a.id, a.classroomId]));
    for (const m of missingByClass) {
      const cid = aToC.get(m.assignmentId);
      if (!cid) continue;
      missingPerClassroom.set(cid, (missingPerClassroom.get(cid) ?? 0) + m._count._all);
    }
  }

  const upcomingMap = new Map(upcomingByClass.map((u) => [u.classroomId ?? "", u._count._all]));

  return links.map<TeacherClassRow>((l) => ({
    classroomId: l.classroom.id,
    name: l.classroom.name,
    branch: l.classroom.branch,
    studentCount: l.classroom._count.students,
    upcomingLessonCount: upcomingMap.get(l.classroom.id) ?? 0,
    attendanceRiskCount: riskCount(l.classroom.id),
    missingHomeworkCount: missingPerClassroom.get(l.classroom.id) ?? 0,
    isLead: l.isLead,
    subject: l.subject,
  })).sort((a, b) => a.name.localeCompare(b.name, "tr"));
}

// ────────────────────────────────────────────────────────────────────────────
// 5) getTeacherRiskyStudents
// ────────────────────────────────────────────────────────────────────────────

export type RiskReason = "ABSENCE" | "LATE_OR_LEFT_EARLY" | "MISSING_HOMEWORK";

export type TeacherRiskyStudentRow = {
  studentId: string;
  fullName: string;
  classroomName: string | null;
  classroomId: string | null;
  reasons: RiskReason[];
  absenceCount: number;
  lateCount: number;
  missingHomeworkCount: number;
  lastActivityAt: Date | null;
};

/**
 * Deterministic risk rules over the last 30 days for students in the
 * teacher's classrooms:
 *   - ≥2 ABSENT             → ABSENCE
 *   - ≥2 (LATE | LEFT_EARLY) → LATE_OR_LEFT_EARLY
 *   - ≥2 MISSED submissions → MISSING_HOMEWORK
 *
 * Returns at most `limit` students, sorted by total reason count desc, then
 * absence count desc.
 */
export async function getTeacherRiskyStudents(
  teacherId: string,
  limit = 10,
): Promise<TeacherRiskyStudentRow[]> {
  const since = daysAgo(30);
  const links = await prisma.classroomTeacher.findMany({
    where: { teacherId },
    select: { classroomId: true },
  });
  const classroomIds = links.map((l) => l.classroomId);
  if (classroomIds.length === 0) return [];

  const [attendances, submissions, students] = await Promise.all([
    prisma.attendance.findMany({
      where: {
        sessionDate: { gte: since },
        status: { in: ["ABSENT", "LATE", "LEFT_EARLY"] satisfies AttendanceStatus[] },
        OR: [
          { classroomId: { in: classroomIds } },
          { lesson: { classroomId: { in: classroomIds }, teacherId } },
        ],
      },
      select: {
        studentId: true,
        status: true,
        sessionDate: true,
        classroomId: true,
        lesson: { select: { classroomId: true } },
      },
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        status: "MISSED",
        createdAt: { gte: since },
        assignment: { teacherId, classroomId: { in: classroomIds } },
      },
      select: { studentId: true, createdAt: true },
    }),
    prisma.classroomStudent.findMany({
      where: { classroomId: { in: classroomIds }, leftAt: null },
      select: {
        studentId: true,
        classroomId: true,
        student: { select: { fullName: true } },
        classroom: { select: { name: true } },
      },
    }),
  ]);

  // Pick a primary classroom per student (first one we see — students may be
  // in multiple of the teacher's classes; show the one with most recent join).
  const studentMeta = new Map<string, { fullName: string; classroomName: string | null; classroomId: string | null }>();
  for (const cs of students) {
    if (!studentMeta.has(cs.studentId)) {
      studentMeta.set(cs.studentId, {
        fullName: cs.student.fullName,
        classroomName: cs.classroom.name,
        classroomId: cs.classroomId,
      });
    }
  }

  type Counters = { absence: number; late: number; missing: number; lastActivityAt: Date | null };
  const counters = new Map<string, Counters>();
  const bump = (sid: string, key: keyof Counters, ts: Date | null) => {
    let c = counters.get(sid);
    if (!c) { c = { absence: 0, late: 0, missing: 0, lastActivityAt: null }; counters.set(sid, c); }
    if (key === "absence") c.absence++;
    else if (key === "late") c.late++;
    else if (key === "missing") c.missing++;
    if (ts && (!c.lastActivityAt || ts > c.lastActivityAt)) c.lastActivityAt = ts;
  };

  for (const a of attendances) {
    if (a.status === "ABSENT") bump(a.studentId, "absence", a.sessionDate);
    else bump(a.studentId, "late", a.sessionDate);
  }
  for (const s of submissions) bump(s.studentId, "missing", s.createdAt);

  const rows: TeacherRiskyStudentRow[] = [];
  for (const [sid, c] of counters.entries()) {
    const reasons: RiskReason[] = [];
    if (c.absence >= 2) reasons.push("ABSENCE");
    if (c.late >= 2) reasons.push("LATE_OR_LEFT_EARLY");
    if (c.missing >= 2) reasons.push("MISSING_HOMEWORK");
    if (reasons.length === 0) continue;
    const meta = studentMeta.get(sid);
    if (!meta) continue; // student no longer in any of the teacher's classes
    rows.push({
      studentId: sid,
      fullName: meta.fullName,
      classroomName: meta.classroomName,
      classroomId: meta.classroomId,
      reasons,
      absenceCount: c.absence,
      lateCount: c.late,
      missingHomeworkCount: c.missing,
      lastActivityAt: c.lastActivityAt,
    });
  }
  rows.sort((a, b) => {
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
    return b.absenceCount - a.absenceCount;
  });
  return rows.slice(0, limit);
}

// ────────────────────────────────────────────────────────────────────────────
// 6) getTeacherUpcomingLessons
// ────────────────────────────────────────────────────────────────────────────

export type TeacherUpcomingLesson = {
  id: string;
  scheduledAt: Date;
  title: string | null;
  subject: string | null;
  classroomName: string | null;
  status: LessonStatus;
  studentName: string;
};

/** Next 7 days starting tomorrow (today is the timeline). */
export async function getTeacherUpcomingLessons(
  teacherId: string,
  limit = 30,
): Promise<TeacherUpcomingLesson[]> {
  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      scheduledAt: { gt: endOfDay(), lte: daysAhead(7) },
      status: { in: ["SCHEDULED", "LIVE"] satisfies LessonStatus[] },
    },
    orderBy: { scheduledAt: "asc" },
    take: limit,
    select: {
      id: true,
      scheduledAt: true,
      title: true,
      subject: true,
      status: true,
      classroom: { select: { name: true } },
      student: { select: { fullName: true } },
    },
  });
  return lessons.map((l) => ({
    id: l.id,
    scheduledAt: l.scheduledAt,
    title: l.title,
    subject: l.subject,
    classroomName: l.classroom?.name ?? null,
    status: l.status,
    studentName: l.student.fullName,
  }));
}

// ════════════════════════════════════════════════════════════════════════════
// Phase 2 / Session 2 — Class detail (cockpit) helpers
// ════════════════════════════════════════════════════════════════════════════

/** Lookback window used by both dashboard risky-students and class heatmap. */
export const RISK_LOOKBACK_DAYS = 30;

export type RiskLevel = "good" | "watch" | "risk" | "unknown";

export type StudentRiskCounts = {
  absences: number;
  latesOrLeftEarly: number;
  missingHomework: number;
};

/**
 * Deterministic, shared risk classifier for a single student over the
 * lookback window. Used by `getTeacherClassRiskRows` and any future
 * heatmap surface so the rules cannot drift apart.
 *
 * Rules:
 *   risk    → ≥2 absences  OR ≥2 late/LEFT_EARLY  OR ≥2 missing homework
 *   watch   → exactly 1 of any of the above (no risk threshold met)
 *   good    → no negative signal in any dimension
 *   unknown → caller signals there is no recorded data at all (zero attendance
 *             AND zero homework rows in the window). Caller must pass
 *             `hasAnyData=false` to opt in; otherwise `good` is returned.
 */
export function classifyStudentRisk(
  c: StudentRiskCounts,
  hasAnyData = true,
): RiskLevel {
  if (c.absences >= 2 || c.latesOrLeftEarly >= 2 || c.missingHomework >= 2) return "risk";
  if (c.absences >= 1 || c.latesOrLeftEarly >= 1 || c.missingHomework >= 1) return "watch";
  return hasAnyData ? "good" : "unknown";
}

/** Per-cell tone for the heatmap. Mirrors `Badge`/`Card` tones. */
export type CellTone = "good" | "warn" | "bad" | "neutral";

export function cellToneForCount(count: number): CellTone {
  if (count >= 2) return "bad";
  if (count === 1) return "warn";
  return "good";
}

export function riskLevelTone(r: RiskLevel): CellTone {
  switch (r) {
    case "risk":    return "bad";
    case "watch":   return "warn";
    case "good":    return "good";
    case "unknown": return "neutral";
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Authorization helper
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns the ClassroomTeacher link if the teacher is assigned to the
 * classroom; otherwise null. Used as the auth gate for the class detail
 * route.
 */
export async function getTeacherClassroomLink(
  teacherId: string,
  classroomId: string,
): Promise<{ isLead: boolean; subject: string | null } | null> {
  const link = await prisma.classroomTeacher.findUnique({
    where: { classroomId_teacherId: { classroomId, teacherId } },
    select: { isLead: true, subject: true },
  });
  return link;
}

// ────────────────────────────────────────────────────────────────────────────
// 7) getTeacherClassDetail
// ────────────────────────────────────────────────────────────────────────────

export type TeacherClassDetail = {
  classroomId: string;
  name: string;
  branch: string | null;
  level: string;
  capacity: number;
  description: string | null;
  studentCount: number;
  isLead: boolean;
  subject: string | null;
  /** Other teachers assigned to the same classroom, name + isLead. */
  coTeachers: Array<{ teacherId: string; fullName: string; isLead: boolean; subject: string | null }>;
  todayLessonCount: number;
  upcomingLessonCount: number;
};

export async function getTeacherClassDetail(
  teacherId: string,
  classroomId: string,
): Promise<TeacherClassDetail | null> {
  const link = await getTeacherClassroomLink(teacherId, classroomId);
  if (!link) return null;

  const [classroom, teachers, todayCount, upcomingCount] = await Promise.all([
    prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        branch: true,
        level: true,
        capacity: true,
        description: true,
        _count: { select: { students: { where: { leftAt: null } } } },
      },
    }),
    prisma.classroomTeacher.findMany({
      where: { classroomId, teacherId: { not: teacherId } },
      select: {
        teacherId: true,
        isLead: true,
        subject: true,
        teacher: { select: { fullName: true } },
      },
    }),
    prisma.lesson.count({
      where: {
        teacherId,
        classroomId,
        scheduledAt: { gte: startOfDay(), lte: endOfDay() },
      },
    }),
    prisma.lesson.count({
      where: {
        teacherId,
        classroomId,
        scheduledAt: { gte: new Date(), lte: daysAhead(7) },
        status: { in: ["SCHEDULED", "LIVE"] satisfies LessonStatus[] },
      },
    }),
  ]);
  if (!classroom) return null;

  return {
    classroomId: classroom.id,
    name: classroom.name,
    branch: classroom.branch,
    level: classroom.level,
    capacity: classroom.capacity,
    description: classroom.description,
    studentCount: classroom._count.students,
    isLead: link.isLead,
    subject: link.subject,
    coTeachers: teachers.map((t) => ({
      teacherId: t.teacherId,
      fullName: t.teacher.fullName,
      isLead: t.isLead,
      subject: t.subject,
    })),
    todayLessonCount: todayCount,
    upcomingLessonCount: upcomingCount,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 8) getTeacherClassRiskRows  (heatmap data)
// ────────────────────────────────────────────────────────────────────────────

export type ClassRiskRow = {
  studentId: string;
  fullName: string;
  classLevel: string | null;
  hasParentLink: boolean;
  tags: Array<{ key: string; label: string; color: string }>;
  counts: StudentRiskCounts;
  /** % of submissions GRADED in lookback window. null if no submissions. */
  gradedPct: number | null;
  /** Avg score (graded only), null if no graded submissions. */
  avgScore: number | null;
  riskLevel: RiskLevel;
  lastActivityAt: Date | null;
};

/**
 * Builds heatmap rows for a class. Permission is enforced by the caller
 * passing teacherId — we re-verify the link to prevent caller-side bypass.
 */
export async function getTeacherClassRiskRows(
  teacherId: string,
  classroomId: string,
): Promise<ClassRiskRow[]> {
  const link = await getTeacherClassroomLink(teacherId, classroomId);
  if (!link) return [];

  const since = daysAgo(RISK_LOOKBACK_DAYS);

  const [roster, attendances, submissions] = await Promise.all([
    prisma.classroomStudent.findMany({
      where: { classroomId, leftAt: null },
      orderBy: { student: { fullName: "asc" } },
      select: {
        studentId: true,
        student: {
          select: {
            fullName: true,
            classLevel: true,
            _count: { select: { parents: true } },
            tags: {
              select: {
                tag: { select: { key: true, label: true, color: true } },
              },
            },
          },
        },
      },
    }),
    prisma.attendance.findMany({
      where: {
        sessionDate: { gte: since },
        OR: [
          { classroomId },
          { lesson: { classroomId, teacherId } },
        ],
      },
      select: { studentId: true, status: true, sessionDate: true },
    }),
    prisma.assignmentSubmission.findMany({
      where: {
        createdAt: { gte: since },
        assignment: { teacherId, classroomId },
      },
      select: { studentId: true, status: true, score: true, gradedAt: true, createdAt: true },
    }),
  ]);

  type Counters = StudentRiskCounts & {
    submissionsTotal: number;
    submissionsGraded: number;
    scoreSum: number;
    scoreCount: number;
    lastActivityAt: Date | null;
    hasAnyData: boolean;
  };
  const ZERO = (): Counters => ({
    absences: 0, latesOrLeftEarly: 0, missingHomework: 0,
    submissionsTotal: 0, submissionsGraded: 0,
    scoreSum: 0, scoreCount: 0,
    lastActivityAt: null,
    hasAnyData: false,
  });
  const map = new Map<string, Counters>();
  const get = (sid: string): Counters => {
    let c = map.get(sid);
    if (!c) { c = ZERO(); map.set(sid, c); }
    return c;
  };
  const touch = (c: Counters, ts: Date) => {
    c.hasAnyData = true;
    if (!c.lastActivityAt || ts > c.lastActivityAt) c.lastActivityAt = ts;
  };

  for (const a of attendances) {
    const c = get(a.studentId);
    touch(c, a.sessionDate);
    if (a.status === "ABSENT") c.absences++;
    else if (a.status === "LATE" || a.status === "LEFT_EARLY") c.latesOrLeftEarly++;
  }
  for (const s of submissions) {
    const c = get(s.studentId);
    touch(c, s.gradedAt ?? s.createdAt);
    c.submissionsTotal++;
    if (s.status === "MISSED") c.missingHomework++;
    if (s.status === "GRADED") {
      c.submissionsGraded++;
      if (typeof s.score === "number") {
        c.scoreSum += s.score;
        c.scoreCount++;
      }
    }
  }

  return roster.map<ClassRiskRow>((r) => {
    const c = map.get(r.studentId) ?? ZERO();
    const counts: StudentRiskCounts = {
      absences: c.absences,
      latesOrLeftEarly: c.latesOrLeftEarly,
      missingHomework: c.missingHomework,
    };
    const gradedPct = c.submissionsTotal > 0
      ? Math.round((c.submissionsGraded / c.submissionsTotal) * 100)
      : null;
    const avgScore = c.scoreCount > 0
      ? Math.round((c.scoreSum / c.scoreCount) * 10) / 10
      : null;
    return {
      studentId: r.studentId,
      fullName: r.student.fullName,
      classLevel: r.student.classLevel,
      hasParentLink: r.student._count.parents > 0,
      tags: r.student.tags.map((t) => ({
        key: t.tag.key,
        label: t.tag.label,
        color: t.tag.color,
      })),
      counts,
      gradedPct,
      avgScore,
      riskLevel: classifyStudentRisk(counts, c.hasAnyData),
      lastActivityAt: c.lastActivityAt,
    };
  });
}

// ────────────────────────────────────────────────────────────────────────────
// 9) getTeacherClassUpcomingLessons
// ────────────────────────────────────────────────────────────────────────────

export type ClassUpcomingLesson = {
  id: string;
  scheduledAt: Date;
  duration: number;
  title: string | null;
  subject: string | null;
  status: LessonStatus;
  meetingJoinUrl: string | null;
  googleMeetLink: string | null;
  attendanceTaken: boolean;
  isPast: boolean;
};

/**
 * Returns lessons for this classroom from `since` (default = today's start)
 * through +14 days, fan-out collapsed into one row per (classroomId,
 * scheduledAt minute).
 */
export async function getTeacherClassUpcomingLessons(
  teacherId: string,
  classroomId: string,
  daysWindow = 14,
): Promise<ClassUpcomingLesson[]> {
  const link = await getTeacherClassroomLink(teacherId, classroomId);
  if (!link) return [];

  const lessons = await prisma.lesson.findMany({
    where: {
      teacherId,
      classroomId,
      scheduledAt: { gte: startOfDay(), lte: daysAhead(daysWindow) },
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
      attendances: { select: { id: true }, take: 1 },
    },
  });

  // Collapse fan-out by start minute (classroomId is fixed).
  const seen = new Set<string>();
  const out: ClassUpcomingLesson[] = [];
  const now = Date.now();
  for (const l of lessons) {
    const key = `${Math.floor(l.scheduledAt.getTime() / 60000)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: l.id,
      scheduledAt: l.scheduledAt,
      duration: l.duration,
      title: l.title,
      subject: l.subject,
      status: l.status,
      meetingJoinUrl: l.meetingJoinUrl,
      googleMeetLink: l.googleMeetLink,
      attendanceTaken: l.attendances.length > 0,
      isPast: l.scheduledAt.getTime() < now,
    });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────────
// 10) getTeacherClassAttendanceSummary
// ────────────────────────────────────────────────────────────────────────────

export type ClassAttendanceSummary = {
  totalRecords: number;
  byStatus: Record<AttendanceStatus, number>;
  /** Distinct lessons that had at least one attendance record. */
  lessonsWithAttendance: number;
  /** Top students by absence count, capped at 5. */
  topAbsences: Array<{ studentId: string; fullName: string; absenceCount: number }>;
};

const EMPTY_BY_STATUS = (): Record<AttendanceStatus, number> => ({
  PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, LEFT_EARLY: 0,
} as Record<AttendanceStatus, number>);

export async function getTeacherClassAttendanceSummary(
  teacherId: string,
  classroomId: string,
): Promise<ClassAttendanceSummary> {
  const link = await getTeacherClassroomLink(teacherId, classroomId);
  if (!link) {
    return { totalRecords: 0, byStatus: EMPTY_BY_STATUS(), lessonsWithAttendance: 0, topAbsences: [] };
  }
  const since = daysAgo(RISK_LOOKBACK_DAYS);

  const attendances = await prisma.attendance.findMany({
    where: {
      sessionDate: { gte: since },
      OR: [
        { classroomId },
        { lesson: { classroomId, teacherId } },
      ],
    },
    select: {
      status: true,
      studentId: true,
      lessonId: true,
      student: { select: { fullName: true } },
    },
  });

  const byStatus = EMPTY_BY_STATUS();
  const lessonSet = new Set<string>();
  const absenceByStudent = new Map<string, { fullName: string; count: number }>();
  for (const a of attendances) {
    byStatus[a.status]++;
    if (a.lessonId) lessonSet.add(a.lessonId);
    if (a.status === "ABSENT") {
      const cur = absenceByStudent.get(a.studentId) ?? { fullName: a.student.fullName, count: 0 };
      cur.count++;
      absenceByStudent.set(a.studentId, cur);
    }
  }
  const topAbsences = Array.from(absenceByStudent.entries())
    .map(([studentId, v]) => ({ studentId, fullName: v.fullName, absenceCount: v.count }))
    .sort((a, b) => b.absenceCount - a.absenceCount)
    .slice(0, 5);

  return {
    totalRecords: attendances.length,
    byStatus,
    lessonsWithAttendance: lessonSet.size,
    topAbsences,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// 11) getTeacherClassHomeworkSummary
// ────────────────────────────────────────────────────────────────────────────

export type ClassHomeworkRow = {
  assignmentId: string;
  title: string;
  dueAt: Date | null;
  expected: number;
  submittedCount: number;
  ungradedCount: number;
  missedCount: number;
  operationalStatus: AssignmentOperationalStatus;
};

export type ClassHomeworkSummary = {
  activeCount: number;
  totalSubmissions: number;
  ungradedCount: number;
  overdueCount: number;
  missedCount: number;
  /** Recent active assignments, max 8, sorted by due date asc (nulls last). */
  recent: ClassHomeworkRow[];
};

export async function getTeacherClassHomeworkSummary(
  teacherId: string,
  classroomId: string,
): Promise<ClassHomeworkSummary> {
  const link = await getTeacherClassroomLink(teacherId, classroomId);
  if (!link) {
    return { activeCount: 0, totalSubmissions: 0, ungradedCount: 0, overdueCount: 0, missedCount: 0, recent: [] };
  }

  const assignments = await prisma.assignment.findMany({
    where: { teacherId, classroomId },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      title: true,
      dueAt: true,
      status: true,
      submissions: { select: { status: true, gradedAt: true } },
    },
  });

  const now = new Date();
  const rows: ClassHomeworkRow[] = [];
  let totalSubmissions = 0;
  let ungradedTotal = 0;
  let overdueTotal = 0;
  let missedTotal = 0;
  let activeCount = 0;

  for (const a of assignments) {
    let pending = 0, submitted = 0, graded = 0, late = 0, missed = 0;
    let ungraded = 0;
    for (const s of a.submissions) {
      switch (s.status) {
        case "PENDING": pending++; break;
        case "SUBMITTED": submitted++; if (!s.gradedAt) ungraded++; break;
        case "GRADED": graded++; break;
        case "LATE": late++; if (!s.gradedAt) ungraded++; break;
        case "MISSED": missed++; break;
      }
    }
    const expected = a.submissions.length;
    const op = getAssignmentOperationalStatus(
      { status: a.status, dueAt: a.dueAt },
      { expected, pending, submitted, graded, late, missed },
      now,
    );
    if (a.status !== "DRAFT") activeCount++;
    totalSubmissions += submitted + graded + late;
    ungradedTotal += ungraded;
    missedTotal += missed;
    if (op === "OVERDUE") overdueTotal++;
    rows.push({
      assignmentId: a.id,
      title: a.title,
      dueAt: a.dueAt,
      expected,
      submittedCount: submitted + late,
      ungradedCount: ungraded,
      missedCount: missed,
      operationalStatus: op,
    });
  }

  rows.sort((a, b) => {
    const da = a.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const db = b.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return da - db;
  });

  return {
    activeCount,
    totalSubmissions,
    ungradedCount: ungradedTotal,
    overdueCount: overdueTotal,
    missedCount: missedTotal,
    recent: rows.slice(0, 8),
  };
}
