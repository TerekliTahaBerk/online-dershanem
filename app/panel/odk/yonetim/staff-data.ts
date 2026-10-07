import { prisma } from "@/lib/prisma";
import { STAFF_PERMISSIONS, type StaffPermission } from "@/lib/products/staff-permission-matrix";
import { effectiveStaffPermissions } from "@/lib/products/staff-permissions";
import { getOdkExamReadiness } from "@/lib/odk/admin-exam-server";
import { getOdkExamFamilyCode } from "@/lib/odk/exam-family";
import {
  answerKeyRevisionEvent,
  examLifecycleEvents,
  importAuditEvent,
  mergeActivity,
  readinessChecklist,
  staffAttentionRows,
  type ActivityEvent,
  type AttentionRow,
} from "@/lib/odk/staff-workspace";

/**
 * Deneme Ligi personel sayfalarının sunucu okuma katmanı. İzin filtresi saf
 * kurallarda (`lib/odk/staff-workspace.ts`); burada yalnız sorgular var.
 */

export const SUBMITTED_STATUSES = ["SUBMITTED", "AUTO_SUBMITTED", "REVIEW_REQUIRED"] as const;

/** ADMIN break-glass: her izin. Diğer personel: etkin atama izinleri. */
export async function loadStaffViewer(userId: string): Promise<{ isAdmin: boolean; permissions: Set<StaffPermission> }> {
  const { isAdmin, permissions } = await effectiveStaffPermissions(userId);
  return { isAdmin, permissions: isAdmin ? new Set(STAFF_PERMISSIONS) : permissions };
}

export type UpcomingExam = {
  id: string;
  title: string;
  family: string;
  status: import("@prisma/client").OdkExamStatus;
  startsAt: Date | null;
  readinessDone: number;
  readinessTotal: number;
};

export type LiveExamSummary = { id: string; title: string; active: number; submitted: number; assigned: number };

export type StaffHomeData = {
  weekCount: number;
  awaitingReleaseCount: number;
  attention: AttentionRow[];
  upcoming: UpcomingExam[];
  live: LiveExamSummary[];
  activity: ActivityEvent[];
};

const PREP_SCAN_LIMIT = 8;

async function readinessFor(examId: string) {
  const { exam, issues } = await getOdkExamReadiness(examId);
  const sections = exam?.currentVersion?.sections ?? [];
  return readinessChecklist({
    examId,
    questionCount: sections.reduce((sum, section) => sum + section.questions.length, 0),
    sectionCount: sections.length,
    hasBooklet: Boolean(exam?.currentVersion?.files.some((file) => file.type === "BOOKLET_PDF")),
    issues,
    securityLabel: "",
  });
}

export async function loadStaffHome(permissions: ReadonlySet<StaffPermission>, now = new Date()): Promise<StaffHomeData> {
  const weekStart = new Date(now.getTime() - 3 * 86_400_000);
  const weekEnd = new Date(now.getTime() + 7 * 86_400_000);
  const canEdit = permissions.has("odk:exam:edit");
  const canOps = permissions.has("odk:ops:live");

  const [weekCount, drafts, ended, scored, flagged, upcomingRaw, liveRaw, imports, revisions, lifecycle] = await Promise.all([
    prisma.odkExam.count({ where: { status: { not: "ARCHIVED" }, startsAt: { gte: weekStart, lte: weekEnd } } }),
    canEdit
      ? prisma.odkExam.findMany({ where: { status: "DRAFT" }, orderBy: { updatedAt: "desc" }, take: PREP_SCAN_LIMIT, select: { id: true, title: true } })
      : Promise.resolve([]),
    prisma.odkExam.findMany({
      where: { OR: [{ status: "ENDED" }, { status: { in: ["SCHEDULED", "LIVE", "SCORED"] }, endsAt: { lte: now } }] },
      orderBy: { endsAt: "desc" },
      take: 20,
      select: {
        id: true,
        title: true,
        status: true,
        _count: { select: { attempts: { where: { status: { in: [...SUBMITTED_STATUSES] }, score: { is: null } } } } },
      },
    }),
    prisma.odkExam.findMany({ where: { status: "SCORED" }, orderBy: { updatedAt: "desc" }, take: 20, select: { id: true, title: true } }),
    prisma.odkExamAttempt.groupBy({
      by: ["examId"],
      where: { integrityLevel: { not: "NORMAL" }, integrityReviewedAt: null, status: { not: "VOID" }, exam: { status: { not: "ARCHIVED" } } },
      _count: { _all: true },
    }),
    prisma.odkExam.findMany({
      where: { status: { in: ["DRAFT", "READY", "SCHEDULED"] }, OR: [{ startsAt: null }, { startsAt: { gte: now } }] },
      orderBy: [{ startsAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 6,
      select: { id: true, title: true, status: true, startsAt: true, family: true, examFamilyRef: { select: { code: true } } },
    }),
    canOps
      ? prisma.odkExam.findMany({
          where: { status: { in: ["SCHEDULED", "LIVE"] }, startsAt: { lte: now }, endsAt: { gt: now } },
          orderBy: { startsAt: "asc" },
          take: 5,
          select: {
            id: true,
            title: true,
            _count: { select: { assignments: { where: { isActive: true } } } },
            attempts: { where: { status: { not: "VOID" } }, select: { status: true, deadlineAt: true } },
          },
        })
      : Promise.resolve([]),
    prisma.odkImportAudit.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        kind: true,
        status: true,
        createdAt: true,
        committedAt: true,
        errorCount: true,
        exam: { select: { id: true, title: true } },
        createdBy: { select: { fullName: true } },
      },
    }),
    prisma.odkAnswerKeyRevision.findMany({
      orderBy: { createdAt: "desc" },
      take: 4,
      select: {
        id: true,
        revisionNumber: true,
        reason: true,
        createdAt: true,
        changedBy: { select: { fullName: true } },
        version: { select: { exam: { select: { id: true, title: true } } } },
      },
    }),
    prisma.odkExam.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: { id: true, title: true, createdAt: true, contentLockedAt: true, publishedAt: true, resultsReleasedAt: true, answerKeyReleasedAt: true },
    }),
  ]);

  const flaggedTitles = flagged.length
    ? new Map(
        (await prisma.odkExam.findMany({ where: { id: { in: flagged.map((item) => item.examId) } }, select: { id: true, title: true } })).map((exam) => [
          exam.id,
          exam.title,
        ]),
      )
    : new Map<string, string>();

  const [prepReadiness, upcomingReadiness] = await Promise.all([
    Promise.all(drafts.map(async (exam) => ({ exam, readiness: await getOdkExamReadiness(exam.id) }))),
    Promise.all(upcomingRaw.map((exam) => readinessFor(exam.id))),
  ]);

  const attention = staffAttentionRows(
    {
      prep: prepReadiness.map(({ exam, readiness }) => {
        const blocking = readiness.issues.filter((issue) => issue.level === "error");
        const first = blocking[0] as { message: string; questionNumber?: number } | undefined;
        return {
          id: exam.id,
          title: exam.title,
          blockingIssues: blocking.length,
          firstIssue: first ? `${first.questionNumber ? `Soru ${first.questionNumber}: ` : ""}${first.message}` : undefined,
        };
      }),
      unscored: ended.filter((exam) => exam._count.attempts > 0).map((exam) => ({ id: exam.id, title: exam.title, count: exam._count.attempts })),
      awaitingRelease: scored.filter((exam) => !ended.some((item) => item.id === exam.id && item._count.attempts > 0)),
      integrity: flagged.map((item) => ({ id: item.examId, title: flaggedTitles.get(item.examId) ?? "Deneme", count: item._count._all })),
    },
    permissions,
  );

  return {
    weekCount,
    awaitingReleaseCount: scored.length,
    attention,
    upcoming: upcomingRaw.map((exam, index) => ({
      id: exam.id,
      title: exam.title,
      family: getOdkExamFamilyCode(exam),
      status: exam.status,
      startsAt: exam.startsAt,
      readinessDone: upcomingReadiness[index]!.done,
      readinessTotal: upcomingReadiness[index]!.items.length,
    })),
    live: liveRaw.map((exam) => ({
      id: exam.id,
      title: exam.title,
      assigned: exam._count.assignments,
      active: exam.attempts.filter((attempt) => attempt.status === "IN_PROGRESS" && attempt.deadlineAt > now).length,
      submitted: exam.attempts.filter((attempt) => attempt.status !== "IN_PROGRESS").length,
    })),
    activity: mergeActivity(
      [
        lifecycle.flatMap(examLifecycleEvents),
        imports.map((audit) => importAuditEvent({ ...audit, actor: audit.createdBy.fullName })),
        revisions.map((revision) => answerKeyRevisionEvent({ ...revision, exam: revision.version.exam, actor: revision.changedBy.fullName })),
      ],
      8,
    ),
  };
}

/** Tek deneme için "Geçmiş" sekmesi. */
export async function loadExamHistory(exam: {
  id: string;
  title: string;
  createdAt: Date;
  contentLockedAt: Date | null;
  publishedAt: Date | null;
  resultsReleasedAt: Date | null;
  answerKeyReleasedAt: Date | null;
}): Promise<ActivityEvent[]> {
  const [imports, revisions] = await Promise.all([
    prisma.odkImportAudit.findMany({
      where: { examId: exam.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, kind: true, status: true, createdAt: true, committedAt: true, errorCount: true, createdBy: { select: { fullName: true } } },
    }),
    prisma.odkAnswerKeyRevision.findMany({
      where: { version: { examId: exam.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, revisionNumber: true, reason: true, createdAt: true, changedBy: { select: { fullName: true } } },
    }),
  ]);
  const ref = { id: exam.id, title: exam.title };
  return mergeActivity(
    [
      examLifecycleEvents(exam),
      imports.map((audit) => importAuditEvent({ ...audit, exam: ref, actor: audit.createdBy.fullName })),
      revisions.map((revision) => answerKeyRevisionEvent({ ...revision, exam: ref, actor: revision.changedBy.fullName })),
    ],
    100,
  );
}
