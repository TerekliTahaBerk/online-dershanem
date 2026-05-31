/**
 * Phase 2 / Session 18 — Scheduled reminder jobs.
 *
 * Conservative inbox-only reminder foundation. Each job:
 *   1. Scans real DB rows for actionable state (upcoming/overdue/pending).
 *   2. Resolves the recipient user(s) via `lib/notifications` helpers.
 *   3. Skips if a similar inbox message was already created in the same
 *      idempotency window — keyed by `(recipientUserId, relatedEntityType,
 *      relatedEntityId)`.
 *   4. Calls `notifyUser` to write the InboxMessage (+ Notification + push,
 *      reusing the existing notification pipeline).
 *
 * Jobs are STRICTLY read-only on business records. They do NOT:
 *   - flip PaymentScheduleItem.status (overdue stays derived)
 *   - approve/reject AbsenceExcuse rows
 *   - mutate TeacherPayrollPeriod / Item state
 *   - send email / SMS / WhatsApp (no providers wired)
 *
 * All exceptions are caught per-job; one failing job never blocks the others.
 *
 * Idempotency window matrix (documented in §28 of the audit doc):
 *
 *   upcoming-lesson           — 20h   (daily run, prevents same-day duplicate)
 *   homework-due-soon         — 20h
 *   homework-overdue          — 60h   (every ~3 days only)
 *   payment-due-soon          — 20h
 *   payment-overdue           — 60h
 *   absence-excuse-pending    — 20h
 *   homework-review-pending   — 20h
 *   payroll-review-pending    — 60h
 */

import { prisma } from "@/lib/prisma";
import {
  notifyUser,
  getAdminUserIds,
  getStudentUserId,
  getParentUserIdsForStudent,
  resolveTeacherUserId,
} from "@/lib/notifications";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export type JobSummary = {
  job: string;
  scanned: number;
  created: number;
  skipped: number;
  errors: number;
  /** Optional Turkish label for ops dashboards. */
  label?: string;
};

const HOUR = 60 * 60 * 1000;

function makeSummary(job: string, label?: string): JobSummary {
  return { job, label, scanned: 0, created: 0, skipped: 0, errors: 0 };
}

// ──────────────────────────────────────────────────────────────────────────
// Idempotency helper — single source of truth for "already reminded?".
//
// Uses InboxMessage.relatedEntityType + relatedEntityId + recipientUserId
// + createdAt window. No new tables, no schema migration.
// ──────────────────────────────────────────────────────────────────────────

async function alreadyReminded(opts: {
  recipientUserId: string;
  relatedEntityType: string;
  relatedEntityId: string;
  windowMs: number;
  /** Optional title prefix to disambiguate two reminder kinds on the same entity. */
  titlePrefix?: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - opts.windowMs);
  const where: Record<string, unknown> = {
    recipientUserId: opts.recipientUserId,
    relatedEntityType: opts.relatedEntityType,
    relatedEntityId: opts.relatedEntityId,
    createdAt: { gte: since },
  };
  if (opts.titlePrefix) {
    where.title = { startsWith: opts.titlePrefix };
  }
  try {
    const found = await prisma.inboxMessage.findFirst({
      where,
      select: { id: true },
    });
    return !!found;
  } catch {
    // On error, err on the side of NOT spamming (treat as already sent).
    return true;
  }
}

/**
 * Send a reminder if and only if no similar inbox row exists in the window.
 * Returns true if a new message was created.
 */
async function sendReminderOnce(opts: {
  recipientUserId: string;
  windowMs: number;
  payload: Omit<Parameters<typeof notifyUser>[0], "userId">;
  titlePrefix?: string;
}): Promise<{ created: boolean; skipped: boolean; error: boolean }> {
  if (!opts.payload.relatedEntityType || !opts.payload.relatedEntityId) {
    return { created: false, skipped: false, error: true };
  }
  const dup = await alreadyReminded({
    recipientUserId: opts.recipientUserId,
    relatedEntityType: opts.payload.relatedEntityType,
    relatedEntityId: opts.payload.relatedEntityId,
    windowMs: opts.windowMs,
    titlePrefix: opts.titlePrefix,
  });
  if (dup) return { created: false, skipped: true, error: false };
  try {
    await notifyUser({ userId: opts.recipientUserId, ...opts.payload });
    return { created: true, skipped: false, error: false };
  } catch {
    return { created: false, skipped: false, error: true };
  }
}

function fmtTimeTR(d: Date): string {
  return d.toLocaleString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateTR(d: Date): string {
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fmtAmountTR(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(kurus / 100);
}

// ──────────────────────────────────────────────────────────────────────────
// D3 — Upcoming lesson reminders
// ──────────────────────────────────────────────────────────────────────────

/**
 * Inbox reminder for lessons starting within the next 24h.
 * Notifies the student and the teacher (parents intentionally excluded to
 * avoid spam — parents already see the schedule on /panel/veli).
 *
 * Complementary to the existing 15-min push-only `lesson-reminders` cron.
 */
export async function sendUpcomingLessonReminders(): Promise<JobSummary> {
  const summary = makeSummary("upcoming-lesson", "Yaklaşan ders");
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * HOUR);

  const lessons = await prisma.lesson.findMany({
    where: {
      scheduledAt: { gte: now, lt: in24h },
      status: "SCHEDULED",
    },
    select: {
      id: true,
      title: true,
      subject: true,
      scheduledAt: true,
      student: { select: { userId: true, fullName: true } },
      teacher: { select: { userId: true } },
    },
    take: 1000,
  });
  summary.scanned = lessons.length;

  for (const l of lessons) {
    const title = l.title ?? l.subject ?? "Ders";
    const when = fmtTimeTR(l.scheduledAt);
    const recipients = [l.student.userId, l.teacher.userId].filter(
      (x): x is string => !!x,
    );
    for (const userId of recipients) {
      const r = await sendReminderOnce({
        recipientUserId: userId,
        windowMs: 20 * HOUR,
        titlePrefix: "Yaklaşan ders",
        payload: {
          title: "Yaklaşan ders",
          body: `${title} — ${when}`,
          href: "/panel/ogretmen/program",
          type: "LESSON",
          category: "EDUCATION",
          inboxPriority: "NORMAL",
          relatedEntityType: "Lesson",
          relatedEntityId: l.id,
        },
      });
      if (r.created) summary.created += 1;
      else if (r.skipped) summary.skipped += 1;
      else if (r.error) summary.errors += 1;
    }
  }
  return summary;
}

// ──────────────────────────────────────────────────────────────────────────
// D4 — Homework reminders
// ──────────────────────────────────────────────────────────────────────────

/** Notify students for assignments due in the next 24–48h with no submission. */
export async function sendHomeworkDueSoonReminders(): Promise<JobSummary> {
  const summary = makeSummary("homework-due-soon", "Ödev teslim yaklaşıyor");
  const now = new Date();
  const in48h = new Date(now.getTime() + 48 * HOUR);

  const assignments = await prisma.assignment.findMany({
    where: {
      status: "PUBLISHED",
      dueAt: { gte: now, lt: in48h },
    },
    select: {
      id: true,
      title: true,
      dueAt: true,
      studentId: true,
      classroomId: true,
    },
    take: 500,
  });
  summary.scanned = assignments.length;

  for (const a of assignments) {
    if (!a.dueAt) continue;
    // Resolve target student ids: direct + active classroom roster.
    const targetStudentIds = new Set<string>();
    if (a.studentId) targetStudentIds.add(a.studentId);
    if (a.classroomId) {
      const links = await prisma.classroomStudent.findMany({
        where: { classroomId: a.classroomId, leftAt: null },
        select: { studentId: true },
      });
      for (const l of links) targetStudentIds.add(l.studentId);
    }
    if (targetStudentIds.size === 0) continue;

    // Filter out students who already submitted.
    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: a.id,
        studentId: { in: [...targetStudentIds] },
        status: { in: ["SUBMITTED", "GRADED"] },
      },
      select: { studentId: true },
    });
    const submitted = new Set(submissions.map((s) => s.studentId));

    for (const studentId of targetStudentIds) {
      if (submitted.has(studentId)) continue;
      const userId = await getStudentUserId(studentId);
      if (!userId) continue;
      const r = await sendReminderOnce({
        recipientUserId: userId,
        windowMs: 20 * HOUR,
        titlePrefix: "Ödev teslim yaklaşıyor",
        payload: {
          title: "Ödev teslim yaklaşıyor",
          body: `"${a.title}" — son teslim: ${fmtTimeTR(a.dueAt)}`,
          href: `/panel/ogrenci/odevler/${a.id}`,
          type: "CONTENT",
          category: "ASSIGNMENT",
          inboxPriority: "NORMAL",
          relatedEntityType: "Assignment",
          relatedEntityId: a.id,
        },
      });
      if (r.created) summary.created += 1;
      else if (r.skipped) summary.skipped += 1;
      else if (r.error) summary.errors += 1;
    }
  }
  return summary;
}

/**
 * Notify students (and parents) for assignments overdue by ≥ 12h with no
 * submission. Uses a 60h idempotency window so the same student isn't
 * reminded more than ~once every 2.5 days.
 */
export async function sendHomeworkOverdueReminders(): Promise<JobSummary> {
  const summary = makeSummary("homework-overdue", "Ödev gecikti");
  const now = new Date();
  const cutoff = new Date(now.getTime() - 12 * HOUR);
  // Don't chase ancient assignments — only the last 14 days.
  const fromDate = new Date(now.getTime() - 14 * 24 * HOUR);

  const assignments = await prisma.assignment.findMany({
    where: {
      status: "PUBLISHED",
      dueAt: { lt: cutoff, gte: fromDate },
    },
    select: {
      id: true,
      title: true,
      dueAt: true,
      studentId: true,
      classroomId: true,
    },
    take: 500,
  });
  summary.scanned = assignments.length;

  for (const a of assignments) {
    if (!a.dueAt) continue;
    const targetStudentIds = new Set<string>();
    if (a.studentId) targetStudentIds.add(a.studentId);
    if (a.classroomId) {
      const links = await prisma.classroomStudent.findMany({
        where: { classroomId: a.classroomId, leftAt: null },
        select: { studentId: true },
      });
      for (const l of links) targetStudentIds.add(l.studentId);
    }
    if (targetStudentIds.size === 0) continue;

    const submissions = await prisma.assignmentSubmission.findMany({
      where: {
        assignmentId: a.id,
        studentId: { in: [...targetStudentIds] },
        status: { in: ["SUBMITTED", "GRADED"] },
      },
      select: { studentId: true },
    });
    const submitted = new Set(submissions.map((s) => s.studentId));

    for (const studentId of targetStudentIds) {
      if (submitted.has(studentId)) continue;
      const studentUserId = await getStudentUserId(studentId);
      const parentUserIds = await getParentUserIdsForStudent(studentId);
      const recipients = [
        ...(studentUserId ? [studentUserId] : []),
        ...parentUserIds,
      ];
      for (const userId of recipients) {
        const r = await sendReminderOnce({
          recipientUserId: userId,
          windowMs: 60 * HOUR,
          titlePrefix: "Ödev gecikti",
          payload: {
            title: "Ödev gecikti",
            body: `"${a.title}" teslim tarihi geçti (${fmtDateTR(a.dueAt)}).`,
            href: `/panel/ogrenci/odevler/${a.id}`,
            type: "CONTENT",
            category: "ASSIGNMENT",
            inboxPriority: "HIGH",
            relatedEntityType: "Assignment",
            relatedEntityId: a.id,
          },
        });
        if (r.created) summary.created += 1;
        else if (r.skipped) summary.skipped += 1;
        else if (r.error) summary.errors += 1;
      }
    }
  }
  return summary;
}

/** Notify the assigning teacher when there are submissions waiting for grading. */
export async function sendPendingHomeworkReviewReminders(): Promise<JobSummary> {
  const summary = makeSummary("homework-review-pending", "Bekleyen ödev gönderimleri");
  // Group submitted-but-ungraded submissions per assignment.
  const pending = await prisma.assignmentSubmission.groupBy({
    by: ["assignmentId"],
    where: { status: "SUBMITTED" },
    _count: { _all: true },
    orderBy: { assignmentId: "asc" },
    take: 500,
  });
  summary.scanned = pending.length;

  for (const row of pending) {
    const a = await prisma.assignment.findUnique({
      where: { id: row.assignmentId },
      select: {
        id: true,
        title: true,
        teacher: { select: { id: true, userId: true } },
      },
    });
    if (!a?.teacher.userId) continue;
    const r = await sendReminderOnce({
      recipientUserId: a.teacher.userId,
      windowMs: 20 * HOUR,
      titlePrefix: "Bekleyen ödev gönderimleri",
      payload: {
        title: "Bekleyen ödev gönderimleri",
        body: `"${a.title}" — ${row._count._all} gönderim incelemenizi bekliyor.`,
        href: `/panel/ogretmen/odevler/${a.id}`,
        type: "CONTENT",
        category: "ASSIGNMENT",
        inboxPriority: "NORMAL",
        relatedEntityType: "Assignment",
        relatedEntityId: a.id,
      },
    });
    if (r.created) summary.created += 1;
    else if (r.skipped) summary.skipped += 1;
    else if (r.error) summary.errors += 1;
  }
  return summary;
}

// ──────────────────────────────────────────────────────────────────────────
// D5 — Payment reminders
// ──────────────────────────────────────────────────────────────────────────

/** Notify parent for items due in the next 3 days (PENDING/PARTIAL only). */
export async function sendPaymentDueSoonReminders(): Promise<JobSummary> {
  const summary = makeSummary("payment-due-soon", "Yaklaşan ödeme");
  const now = new Date();
  const in3d = new Date(now.getTime() + 3 * 24 * HOUR);

  const items = await prisma.paymentScheduleItem.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      dueDate: { gte: now, lt: in3d },
    },
    select: {
      id: true,
      title: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      studentId: true,
      parentId: true,
    },
    take: 500,
  });
  summary.scanned = items.length;

  for (const it of items) {
    const recipients = new Set<string>();
    if (it.parentId) {
      const p = await prisma.parent.findUnique({
        where: { id: it.parentId },
        select: { userId: true },
      });
      if (p?.userId) recipients.add(p.userId);
    }
    if (it.studentId) {
      for (const uid of await getParentUserIdsForStudent(it.studentId)) {
        recipients.add(uid);
      }
    }
    if (recipients.size === 0) continue;

    const remaining = Math.max(0, it.amount - it.paidAmount);
    for (const userId of recipients) {
      const r = await sendReminderOnce({
        recipientUserId: userId,
        windowMs: 20 * HOUR,
        titlePrefix: "Yaklaşan ödeme",
        payload: {
          title: "Yaklaşan ödeme",
          body: `${it.title} — son ödeme: ${fmtDateTR(it.dueDate)} — ${fmtAmountTR(remaining)}`,
          href: "/panel/veli/odemeler",
          type: "PAYMENT",
          category: "FINANCE",
          inboxPriority: "NORMAL",
          relatedEntityType: "PaymentScheduleItem",
          relatedEntityId: it.id,
        },
      });
      if (r.created) summary.created += 1;
      else if (r.skipped) summary.skipped += 1;
      else if (r.error) summary.errors += 1;
    }
  }
  return summary;
}

/**
 * Notify parent for items overdue (dueDate < now AND PENDING/PARTIAL).
 * Status is NOT mutated — overdue remains a derived UI concept.
 * 60h idempotency → at most ~one nudge per 2.5 days.
 */
export async function sendPaymentOverdueReminders(): Promise<JobSummary> {
  const summary = makeSummary("payment-overdue", "Gecikmiş ödeme");
  const now = new Date();
  // Cap at 90 days back so we don't chase ancient debts.
  const fromDate = new Date(now.getTime() - 90 * 24 * HOUR);

  const items = await prisma.paymentScheduleItem.findMany({
    where: {
      status: { in: ["PENDING", "PARTIAL"] },
      dueDate: { lt: now, gte: fromDate },
    },
    select: {
      id: true,
      title: true,
      amount: true,
      paidAmount: true,
      dueDate: true,
      studentId: true,
      parentId: true,
    },
    take: 500,
  });
  summary.scanned = items.length;

  for (const it of items) {
    const recipients = new Set<string>();
    if (it.parentId) {
      const p = await prisma.parent.findUnique({
        where: { id: it.parentId },
        select: { userId: true },
      });
      if (p?.userId) recipients.add(p.userId);
    }
    if (it.studentId) {
      for (const uid of await getParentUserIdsForStudent(it.studentId)) {
        recipients.add(uid);
      }
    }
    if (recipients.size === 0) continue;

    const remaining = Math.max(0, it.amount - it.paidAmount);
    for (const userId of recipients) {
      const r = await sendReminderOnce({
        recipientUserId: userId,
        windowMs: 60 * HOUR,
        titlePrefix: "Gecikmiş ödeme",
        payload: {
          title: "Gecikmiş ödeme",
          body: `${it.title} — vade: ${fmtDateTR(it.dueDate)} — ${fmtAmountTR(remaining)}`,
          href: "/panel/veli/odemeler",
          type: "PAYMENT",
          category: "FINANCE",
          inboxPriority: "HIGH",
          relatedEntityType: "PaymentScheduleItem",
          relatedEntityId: it.id,
        },
      });
      if (r.created) summary.created += 1;
      else if (r.skipped) summary.skipped += 1;
      else if (r.error) summary.errors += 1;
    }
  }
  return summary;
}

// ──────────────────────────────────────────────────────────────────────────
// D6 — Pending absence excuses
// ──────────────────────────────────────────────────────────────────────────

/**
 * Notify reviewers (the student's teachers + admins) when an excuse has
 * been PENDING for more than 24 hours. Uses 20h idempotency so reminders
 * stay daily without duplicates.
 */
export async function sendPendingAbsenceExcuseReminders(): Promise<JobSummary> {
  const summary = makeSummary("absence-excuse-pending", "Bekleyen mazeret");
  const now = new Date();
  const olderThan = new Date(now.getTime() - 24 * HOUR);

  const excuses = await prisma.absenceExcuse.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: olderThan },
    },
    select: {
      id: true,
      studentId: true,
      reason: true,
      startsAt: true,
      endsAt: true,
      student: { select: { fullName: true } },
    },
    take: 500,
  });
  summary.scanned = excuses.length;

  // Cache admin ids once per run.
  const adminIds = await getAdminUserIds();

  for (const ex of excuses) {
    // Reviewer audience: admins + teachers linked to the student via classroom.
    const teacherUserIds = new Set<string>();
    const links = await prisma.classroomStudent.findMany({
      where: { studentId: ex.studentId, leftAt: null },
      select: {
        classroom: {
          select: {
            teachers: { select: { teacher: { select: { userId: true } } } },
          },
        },
      },
    });
    for (const l of links) {
      for (const ct of l.classroom?.teachers ?? []) {
        if (ct.teacher?.userId) teacherUserIds.add(ct.teacher.userId);
      }
    }
    const recipients = new Set<string>([...adminIds, ...teacherUserIds]);
    if (recipients.size === 0) continue;

    const span = `${fmtDateTR(ex.startsAt)} – ${fmtDateTR(ex.endsAt)}`;
    for (const userId of recipients) {
      const r = await sendReminderOnce({
        recipientUserId: userId,
        windowMs: 20 * HOUR,
        titlePrefix: "Bekleyen mazeret",
        payload: {
          title: "Bekleyen mazeret",
          body: `${ex.student.fullName ?? "Öğrenci"} — ${span}`,
          href: "/panel/admin/mazeretler",
          type: "ANNOUNCEMENT",
          category: "ATTENDANCE",
          inboxPriority: "NORMAL",
          relatedEntityType: "AbsenceExcuse",
          relatedEntityId: ex.id,
        },
      });
      if (r.created) summary.created += 1;
      else if (r.skipped) summary.skipped += 1;
      else if (r.error) summary.errors += 1;
    }
  }
  return summary;
}

// ──────────────────────────────────────────────────────────────────────────
// D7 — Payroll review reminders
// ──────────────────────────────────────────────────────────────────────────

/**
 * Notify admins about payroll periods that need attention:
 *   - DRAFT/REVIEWED periods with items, OR
 *   - LOCKED periods that haven't been marked PAID yet.
 *
 * Period mutation paths (mark-paid/cancel) already emit immediate
 * notifications via `app/panel/admin/ogretmen-hakedisleri/_actions.ts`
 * (Session 16). This job only nudges for the slow-moving review queue.
 *
 * 60h idempotency window → at most ~once every 2.5 days per period.
 */
export async function sendPayrollReviewReminders(): Promise<JobSummary> {
  const summary = makeSummary("payroll-review-pending", "Bordro incelemesi bekliyor");
  const adminIds = await getAdminUserIds();
  if (adminIds.length === 0) return summary;

  const periods = await prisma.teacherPayrollPeriod.findMany({
    where: { status: { in: ["DRAFT", "REVIEWED", "LOCKED"] } },
    select: {
      id: true,
      title: true,
      status: true,
      startsAt: true,
      endsAt: true,
      _count: { select: { items: true } },
    },
    take: 200,
  });
  summary.scanned = periods.length;

  for (const p of periods) {
    if (p._count.items === 0) continue;
    const span = `${fmtDateTR(p.startsAt)} – ${fmtDateTR(p.endsAt)}`;
    const action =
      p.status === "LOCKED"
        ? "ödeme bekliyor"
        : "incelemenizi bekliyor";
    for (const userId of adminIds) {
      const r = await sendReminderOnce({
        recipientUserId: userId,
        windowMs: 60 * HOUR,
        titlePrefix: "Bordro",
        payload: {
          title: `Bordro · ${p.title}`,
          body: `${span} — ${p._count.items} satır ${action}.`,
          href: "/panel/admin/ogretmen-hakedisleri",
          type: "ANNOUNCEMENT",
          category: "FINANCE",
          inboxPriority: p.status === "LOCKED" ? "HIGH" : "NORMAL",
          relatedEntityType: "TeacherPayrollPeriod",
          relatedEntityId: p.id,
        },
      });
      if (r.created) summary.created += 1;
      else if (r.skipped) summary.skipped += 1;
      else if (r.error) summary.errors += 1;
    }
  }
  return summary;
}

// ──────────────────────────────────────────────────────────────────────────
// Aggregator — used by the cron route handler.
// ──────────────────────────────────────────────────────────────────────────

export type ScheduledRemindersResult = {
  jobs: JobSummary[];
  totals: {
    scanned: number;
    created: number;
    skipped: number;
    errors: number;
  };
};

const ALL_JOBS = [
  sendUpcomingLessonReminders,
  sendHomeworkDueSoonReminders,
  sendHomeworkOverdueReminders,
  sendPendingHomeworkReviewReminders,
  sendPaymentDueSoonReminders,
  sendPaymentOverdueReminders,
  sendPendingAbsenceExcuseReminders,
  sendPayrollReviewReminders,
] as const;

/** Run every reminder job; one failing job never blocks the others. */
export async function runAllScheduledReminders(): Promise<ScheduledRemindersResult> {
  const jobs: JobSummary[] = [];
  for (const fn of ALL_JOBS) {
    try {
      jobs.push(await fn());
    } catch (err) {
      console.warn(`[scheduled-reminders] ${fn.name} threw`, err);
      jobs.push({
        job: fn.name,
        scanned: 0,
        created: 0,
        skipped: 0,
        errors: 1,
      });
    }
  }
  const totals = jobs.reduce(
    (acc, j) => ({
      scanned: acc.scanned + j.scanned,
      created: acc.created + j.created,
      skipped: acc.skipped + j.skipped,
      errors: acc.errors + j.errors,
    }),
    { scanned: 0, created: 0, skipped: 0, errors: 0 },
  );
  return { jobs, totals };
}

// Re-export for explicit ad-hoc use (e.g. tests or admin trigger).
export { resolveTeacherUserId };
