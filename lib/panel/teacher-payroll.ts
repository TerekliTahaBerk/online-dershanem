/**
 * Phase 2 / Session 11 — Teacher Payroll / Finance Hub
 * ─────────────────────────────────────────────────────────────────────────
 * Lesson-level payroll calculation + read helpers.
 *
 * Money convention: kuruş (Int), to match `AccountingEntry.amount` and
 * `TeacherPayroll.amount`. 1 TRY = 100.
 *
 * Eligibility (conservative defaults — see `getEligibleLessonsForPayroll`):
 *   - Lesson is in the requested window: scheduledAt in [startsAt, endsAt).
 *   - Lesson is in the past: scheduledAt < now (no future payouts).
 *   - Status ∈ {COMPLETED, ENDED} → eligible.
 *   - Status = MISSED → eligible but flagged `attendanceMissing`.
 *   - Status = SCHEDULED + scheduledAt past → eligible but flagged
 *     `attendanceMissing` (admin should retro-attend or exclude).
 *   - Status = LIVE → NEVER eligible (lesson not yet finished).
 *   - Status = CANCELLED → NEVER eligible.
 *
 * Rate matching priority (most specific wins) — see
 * `getPayrollRateForLesson`:
 *   1) (teacher, course, classroom)
 *   2) (teacher, course)
 *   3) (teacher, classroom)
 *   4) (teacher) default
 *
 * Rule must be `isActive` AND lesson date must satisfy `startsAt`/`endsAt`
 * if either is set. If no rule matches → `rateMissing=true`, `hourlyRate=0`,
 * `grossAmount=0`. Such items are NEVER auto-marked paid.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  TeacherPayrollPeriodStatus,
  TeacherPayrollItemStatus,
} from "@prisma/client";

// Phase 2 / Session 13 — Pure display helpers + row types live in
// `teacher-payroll-display.ts` (no `server-only` marker) so client
// components can import them without pulling Prisma into the bundle.
// We re-export so existing server-side imports keep working.
export {
  type CompensationRuleRow,
  type PayrollPeriodSummary,
  type PayrollTeacherRow,
  type PayrollItemRow,
  type TeacherPayrollReadOnlySummary,
  formatPayrollMoney,
  getPayrollStatusLabel,
  getPayrollStatusTone,
} from "./teacher-payroll-display";

// Internal use of re-exported types within this file:
import type {
  CompensationRuleRow,
  PayrollItemRow,
  PayrollPeriodSummary,
  PayrollTeacherRow,
  TeacherPayrollReadOnlySummary,
} from "./teacher-payroll-display";

// ═════════════════════════════════════════════════════════════════════════
// Internal types (server-only — not exposed to client bundle)
// ═════════════════════════════════════════════════════════════════════════

export type EligibleLesson = {
  id: string;
  teacherId: string;
  teacherName: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: string;
  courseId: string | null;
  classroomId: string | null;
  studentId: string;
  attendanceCount: number;
};

export type LessonRateMatch = {
  ruleId: string | null;
  hourlyRateKurus: number;
  source:
    | "TEACHER_COURSE_CLASSROOM"
    | "TEACHER_COURSE"
    | "TEACHER_CLASSROOM"
    | "TEACHER_DEFAULT"
    | "NONE";
};

export type LessonPayoutCalc = {
  lessonId: string;
  teacherId: string;
  minutes: number;
  hourlyRateKurus: number;
  grossAmountKurus: number;
  rateMissing: boolean;
  attendanceMissing: boolean;
  ruleId: string | null;
  rateSource: LessonRateMatch["source"];
};

// ═════════════════════════════════════════════════════════════════════════
// Compensation rules
// ═════════════════════════════════════════════════════════════════════════

export async function getTeacherCompensationRules(opts?: {
  teacherId?: string;
  activeOnly?: boolean;
}): Promise<CompensationRuleRow[]> {
  const rules = await prisma.teacherCompensationRule.findMany({
    where: {
      ...(opts?.teacherId ? { teacherId: opts.teacherId } : {}),
      ...(opts?.activeOnly ? { isActive: true } : {}),
    },
    include: {
      teacher: { select: { fullName: true } },
      course: { select: { title: true } },
      classroom: { select: { name: true } },
    },
    orderBy: [{ teacherId: "asc" }, { createdAt: "desc" }],
  });
  return rules.map((r) => ({
    id: r.id,
    teacherId: r.teacherId,
    teacherName: r.teacher.fullName,
    courseId: r.courseId,
    courseTitle: r.course?.title ?? null,
    classroomId: r.classroomId,
    classroomName: r.classroom?.name ?? null,
    hourlyRateKurus: r.hourlyRate,
    isActive: r.isActive,
    startsAt: r.startsAt,
    endsAt: r.endsAt,
    note: r.note,
    createdAt: r.createdAt,
  }));
}

/**
 * Resolve the best-matching compensation rule for a lesson at a given date.
 * Pure function — caller passes already-fetched rules to allow batching.
 */
export function getPayrollRateForLesson(
  lesson: {
    teacherId: string;
    courseId: string | null;
    classroomId: string | null;
    scheduledAt: Date;
  },
  rules: Array<{
    id: string;
    teacherId: string;
    courseId: string | null;
    classroomId: string | null;
    hourlyRate: number;
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  }>,
): LessonRateMatch {
  const candidates = rules.filter(
    (r) =>
      r.isActive &&
      r.teacherId === lesson.teacherId &&
      (r.startsAt === null || r.startsAt.getTime() <= lesson.scheduledAt.getTime()) &&
      (r.endsAt === null || r.endsAt.getTime() >= lesson.scheduledAt.getTime()),
  );

  // Priority 1: full match
  const full = candidates.find(
    (r) =>
      r.courseId !== null &&
      r.courseId === lesson.courseId &&
      r.classroomId !== null &&
      r.classroomId === lesson.classroomId,
  );
  if (full) {
    return {
      ruleId: full.id,
      hourlyRateKurus: full.hourlyRate,
      source: "TEACHER_COURSE_CLASSROOM",
    };
  }

  // Priority 2: teacher+course
  const tc = candidates.find(
    (r) =>
      r.courseId !== null &&
      r.courseId === lesson.courseId &&
      r.classroomId === null,
  );
  if (tc) {
    return {
      ruleId: tc.id,
      hourlyRateKurus: tc.hourlyRate,
      source: "TEACHER_COURSE",
    };
  }

  // Priority 3: teacher+classroom
  const tcl = candidates.find(
    (r) =>
      r.classroomId !== null &&
      r.classroomId === lesson.classroomId &&
      r.courseId === null,
  );
  if (tcl) {
    return {
      ruleId: tcl.id,
      hourlyRateKurus: tcl.hourlyRate,
      source: "TEACHER_CLASSROOM",
    };
  }

  // Priority 4: teacher default
  const def = candidates.find(
    (r) => r.courseId === null && r.classroomId === null,
  );
  if (def) {
    return {
      ruleId: def.id,
      hourlyRateKurus: def.hourlyRate,
      source: "TEACHER_DEFAULT",
    };
  }

  return { ruleId: null, hourlyRateKurus: 0, source: "NONE" };
}

export function calculateLessonPayout(
  lesson: { id: string; teacherId: string; durationMinutes: number; attendanceCount: number; status: string },
  rate: LessonRateMatch,
): LessonPayoutCalc {
  const minutes = Math.max(0, lesson.durationMinutes);
  const gross = Math.round((rate.hourlyRateKurus * minutes) / 60);
  const rateMissing = rate.source === "NONE";
  // Conservative: lesson without attendance OR MISSED OR still-SCHEDULED past →
  // flagged. Admin must review.
  const attendanceMissing =
    lesson.attendanceCount === 0 ||
    lesson.status === "MISSED" ||
    lesson.status === "SCHEDULED";
  return {
    lessonId: lesson.id,
    teacherId: lesson.teacherId,
    minutes,
    hourlyRateKurus: rate.hourlyRateKurus,
    grossAmountKurus: rateMissing ? 0 : gross,
    rateMissing,
    attendanceMissing,
    ruleId: rate.ruleId,
    rateSource: rate.source,
  };
}

// ═════════════════════════════════════════════════════════════════════════
// Eligible lessons
// ═════════════════════════════════════════════════════════════════════════

export async function getEligibleLessonsForPayroll(opts: {
  startsAt: Date;
  endsAt: Date;
  teacherId?: string;
}): Promise<EligibleLesson[]> {
  const now = new Date();
  // Only past lessons; never include future scheduled lessons.
  const upperBound =
    opts.endsAt.getTime() < now.getTime() ? opts.endsAt : now;

  const lessons = await prisma.lesson.findMany({
    where: {
      scheduledAt: { gte: opts.startsAt, lt: upperBound },
      status: { in: ["COMPLETED", "ENDED", "MISSED", "SCHEDULED"] },
      ...(opts.teacherId ? { teacherId: opts.teacherId } : {}),
    },
    select: {
      id: true,
      teacherId: true,
      scheduledAt: true,
      duration: true,
      status: true,
      courseId: true,
      classroomId: true,
      studentId: true,
      teacher: { select: { fullName: true } },
      _count: { select: { attendances: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  return lessons.map((l) => ({
    id: l.id,
    teacherId: l.teacherId,
    teacherName: l.teacher.fullName,
    scheduledAt: l.scheduledAt,
    durationMinutes: l.duration,
    status: l.status,
    courseId: l.courseId,
    classroomId: l.classroomId,
    studentId: l.studentId,
    attendanceCount: l._count.attendances,
  }));
}

// ═════════════════════════════════════════════════════════════════════════
// Period summary + teacher rows + items
// ═════════════════════════════════════════════════════════════════════════

export async function getPayrollPeriodSummary(
  periodId: string,
): Promise<PayrollPeriodSummary | null> {
  const period = await prisma.teacherPayrollPeriod.findUnique({
    where: { id: periodId },
    include: { items: true },
  });
  if (!period) return null;

  const teacherIds = new Set<string>();
  let totalMinutes = 0;
  let estimatedKurus = 0;
  let approvedKurus = 0;
  let paidKurus = 0;
  let excludedKurus = 0;
  let rateMissingCount = 0;
  let attendanceMissingCount = 0;

  for (const it of period.items) {
    teacherIds.add(it.teacherId);
    if (it.status === "EXCLUDED") {
      excludedKurus += it.finalAmount;
      continue;
    }
    totalMinutes += it.minutes;
    estimatedKurus += it.finalAmount;
    if (it.status === "APPROVED" || it.status === "PAID") {
      approvedKurus += it.finalAmount;
    }
    if (it.status === "PAID") paidKurus += it.finalAmount;
    if (it.rateMissing) rateMissingCount += 1;
    if (it.attendanceMissing) attendanceMissingCount += 1;
  }

  return {
    periodId: period.id,
    title: period.title,
    startsAt: period.startsAt,
    endsAt: period.endsAt,
    status: period.status,
    lockedAt: period.lockedAt,
    paidAt: period.paidAt,
    totals: {
      itemCount: period.items.length,
      teacherCount: teacherIds.size,
      totalMinutes,
      estimatedKurus,
      approvedKurus,
      paidKurus,
      excludedKurus,
      rateMissingCount,
      attendanceMissingCount,
    },
  };
}

export async function getAdminPayrollDashboard(periodId: string): Promise<{
  period: PayrollPeriodSummary | null;
  teachers: PayrollTeacherRow[];
}> {
  const period = await getPayrollPeriodSummary(periodId);
  if (!period) return { period: null, teachers: [] };

  const items = await prisma.teacherPayrollItem.findMany({
    where: { periodId },
    include: { teacher: { select: { fullName: true } } },
  });

  const map = new Map<string, PayrollTeacherRow>();
  for (const it of items) {
    let row = map.get(it.teacherId);
    if (!row) {
      row = {
        teacherId: it.teacherId,
        teacherName: it.teacher.fullName,
        lessonCount: 0,
        totalMinutes: 0,
        estimatedKurus: 0,
        approvedKurus: 0,
        paidKurus: 0,
        rateMissingCount: 0,
        attendanceMissingCount: 0,
        status: "EMPTY",
      };
      map.set(it.teacherId, row);
    }
    if (it.lessonId) row.lessonCount += 1;
    if (it.status !== "EXCLUDED") {
      row.totalMinutes += it.minutes;
      row.estimatedKurus += it.finalAmount;
      if (it.status === "APPROVED" || it.status === "PAID") {
        row.approvedKurus += it.finalAmount;
      }
      if (it.status === "PAID") row.paidKurus += it.finalAmount;
    }
    if (it.rateMissing) row.rateMissingCount += 1;
    if (it.attendanceMissing) row.attendanceMissingCount += 1;

    // Aggregate worst-status across items.
    row.status = aggregateStatus(row.status, it.status);
  }

  const teachers = Array.from(map.values()).sort((a, b) =>
    a.teacherName.localeCompare(b.teacherName, "tr"),
  );
  return { period, teachers };
}

function aggregateStatus(
  current: PayrollTeacherRow["status"],
  next: TeacherPayrollItemStatus,
): PayrollTeacherRow["status"] {
  // Priority (worst → best): DRAFT > REVIEWED > APPROVED > PAID > EXCLUDED > EMPTY
  const order: Record<PayrollTeacherRow["status"], number> = {
    DRAFT: 5,
    REVIEWED: 4,
    APPROVED: 3,
    PAID: 2,
    EXCLUDED: 1,
    EMPTY: 0,
  };
  const nextRank = order[next as PayrollTeacherRow["status"]] ?? 0;
  return nextRank > order[current] ? (next as PayrollTeacherRow["status"]) : current;
}

export async function getTeacherPayrollItems(
  periodId: string,
  teacherId?: string,
): Promise<PayrollItemRow[]> {
  const items = await prisma.teacherPayrollItem.findMany({
    where: { periodId, ...(teacherId ? { teacherId } : {}) },
    include: {
      teacher: { select: { fullName: true } },
      lesson: {
        select: {
          title: true,
          scheduledAt: true,
          student: { select: { fullName: true } },
          course: { select: { title: true } },
          classroom: { select: { name: true } },
        },
      },
    },
    orderBy: [{ teacherId: "asc" }, { createdAt: "asc" }],
  });

  return items.map((it) => ({
    id: it.id,
    periodId: it.periodId,
    teacherId: it.teacherId,
    teacherName: it.teacher.fullName,
    lessonId: it.lessonId,
    lessonTitle: it.lesson?.title ?? null,
    scheduledAt: it.lesson?.scheduledAt ?? null,
    studentName: it.lesson?.student?.fullName ?? null,
    courseTitle: it.lesson?.course?.title ?? null,
    classroomName: it.lesson?.classroom?.name ?? null,
    minutes: it.minutes,
    hourlyRateKurus: it.hourlyRate,
    grossAmountKurus: it.grossAmount,
    adjustmentAmountKurus: it.adjustmentAmount,
    finalAmountKurus: it.finalAmount,
    status: it.status,
    rateMissing: it.rateMissing,
    attendanceMissing: it.attendanceMissing,
    note: it.note,
    accountingEntryId: it.accountingEntryId,
  }));
}

// ═════════════════════════════════════════════════════════════════════════
// Teacher-facing read-only summary
// ═════════════════════════════════════════════════════════════════════════

// `TeacherPayrollReadOnlySummary` type lives in `./teacher-payroll-display`
// (re-exported above).

/**
 * Read-only payroll snapshot for a teacher. Picks the most recent
 * non-CANCELLED period that has at least one item for this teacher.
 * Teachers can never mutate; this is dashboard/widget data only.
 */
export async function getTeacherPayrollReadOnlySummary(
  teacherId: string,
): Promise<TeacherPayrollReadOnlySummary> {
  // Find latest period that has at least one item for this teacher.
  const latestItem = await prisma.teacherPayrollItem.findFirst({
    where: { teacherId, period: { status: { not: "CANCELLED" } } },
    orderBy: { period: { startsAt: "desc" } },
    select: { periodId: true },
  });

  if (!latestItem) {
    return { hasData: false, currentPeriod: null, recentItems: [] };
  }

  const period = await prisma.teacherPayrollPeriod.findUnique({
    where: { id: latestItem.periodId },
  });
  if (!period) return { hasData: false, currentPeriod: null, recentItems: [] };

  const items = await prisma.teacherPayrollItem.findMany({
    where: { periodId: period.id, teacherId },
  });

  let estimatedKurus = 0;
  let approvedKurus = 0;
  let paidKurus = 0;
  let lessonCount = 0;
  let rateMissingCount = 0;
  let attendanceMissingCount = 0;
  for (const it of items) {
    if (it.status === "EXCLUDED") continue;
    estimatedKurus += it.finalAmount;
    if (it.status === "APPROVED" || it.status === "PAID") {
      approvedKurus += it.finalAmount;
    }
    if (it.status === "PAID") paidKurus += it.finalAmount;
    if (it.lessonId) lessonCount += 1;
    if (it.rateMissing) rateMissingCount += 1;
    if (it.attendanceMissing) attendanceMissingCount += 1;
  }

  const recentItems = await getTeacherPayrollItems(period.id, teacherId);

  return {
    hasData: true,
    currentPeriod: {
      periodId: period.id,
      title: period.title,
      startsAt: period.startsAt,
      endsAt: period.endsAt,
      status: period.status,
      estimatedKurus,
      approvedKurus,
      paidKurus,
      lessonCount,
      rateMissingCount,
      attendanceMissingCount,
    },
    recentItems,
  };
}
