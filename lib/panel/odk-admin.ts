/**
 * Phase 2 / Session 15 — ODK admin exam helpers (server-only aggregation).
 *
 * Read-only helpers for the admin ODK exam list + detail cockpit. Mirrors
 * the publish-gate rules that already live in
 * `app/api/v1/odk/admin/exams/[id]/publish/route.ts` so the admin UI and
 * the server-side gate stay in sync.
 *
 * **Locked invariants (do not relax in this session):**
 *   - We never recompute or mutate historical attempt rows.
 *   - We never bypass `requireAdminApi` / `requirePanelRole("admin")`.
 *   - Existing student access semantics in `lib/panel/odk-student.ts`
 *     are not modified here.
 */
import "server-only";
import { prisma } from "@/lib/prisma";
import type {
  OdkExamStatus,
  OdkExamCadenceFamily,
} from "@prisma/client";
import type {
  AdminExamAccessSummary,
  AdminExamAttemptSummary,
  AdminExamDetail,
  AdminExamListRow,
  AdminExamSectionRow,
  OdkExamReadiness,
  ReadinessLevel,
  ReadinessRule,
} from "./odk-admin-display";

// Re-exports so existing server callers keep working.
export {
  type AdminExamAccessSummary,
  type AdminExamAttemptSummary,
  type AdminExamDetail,
  type AdminExamListRow,
  type AdminExamSectionRow,
  type OdkExamReadiness,
  type ReadinessLevel,
  type ReadinessRule,
  getOdkExamStatusLabel,
  getOdkExamStatusTone,
  getOdkCadenceLabel,
  getReadinessLabel,
  getReadinessTone,
} from "./odk-admin-display";

// ─── Readiness computation (single source of truth for the UI) ──────────────

/**
 * Compute readiness for an exam from already-loaded counts. The rules here
 * MUST stay aligned with the publish-gate in
 * `app/api/v1/odk/admin/exams/[id]/publish/route.ts`. If a rule is changed
 * here it must also be changed there (and vice versa).
 *
 * Rule taxonomy (Session 15):
 *   error  — blocks publish.
 *   warn   — does not block publish, but admin should know.
 *   ok     — pass.
 */
export function computeOdkExamReadiness(input: {
  status: OdkExamStatus;
  durationMinutes: number;
  sectionCount: number;
  totalQuestionCount: number;
  bookletAttached: boolean;
  answerKeyRowCount: number;
  outcomeReadyCount: number;
  outcomeMissingCount: number;
  accessTagCount: number;
  attemptCount: number;
}): OdkExamReadiness {
  const r: ReadinessRule[] = [];

  if (input.status === "ARCHIVED") {
    r.push({
      id: "archived",
      label: "Bu deneme arşivlenmiş",
      level: "warn",
      detail: "Arşivlenmiş denemeler yayınlanamaz. Önce arşivden çıkarın.",
    });
  }

  r.push({
    id: "duration",
    label: "Sınav süresi tanımlı",
    level: input.durationMinutes > 0 ? "ok" : "error",
    detail: input.durationMinutes > 0 ? `${input.durationMinutes} dk` : "Süre 0 olamaz.",
  });

  r.push({
    id: "sections",
    label: "En az 1 bölüm var",
    level: input.sectionCount > 0 ? "ok" : "error",
    detail:
      input.sectionCount > 0
        ? `${input.sectionCount} bölüm · ${input.totalQuestionCount} soru`
        : "Bölüm eklenmemiş.",
  });

  r.push({
    id: "booklet",
    label: "Deneme PDF yüklü",
    level: input.bookletAttached ? "ok" : "error",
    detail: input.bookletAttached ? null : "Soru kitapçığı PDF'i bekleniyor.",
  });

  // Answer key + section total match.
  if (input.totalQuestionCount === 0) {
    r.push({
      id: "answer-key",
      label: "Cevap anahtarı yüklü",
      level: "error",
      detail: "Önce bölüm ve soru sayısı tanımlayın.",
    });
  } else if (input.answerKeyRowCount === 0) {
    r.push({
      id: "answer-key",
      label: "Cevap anahtarı yüklü",
      level: "error",
      detail: `0 / ${input.totalQuestionCount} cevap girildi`,
    });
  } else if (input.answerKeyRowCount !== input.totalQuestionCount) {
    r.push({
      id: "answer-key",
      label: "Cevap anahtarı tam",
      level: "error",
      detail: `${input.answerKeyRowCount} / ${input.totalQuestionCount} cevap girildi`,
    });
  } else {
    r.push({
      id: "answer-key",
      label: "Cevap anahtarı tam",
      level: "ok",
      detail: `${input.answerKeyRowCount} / ${input.totalQuestionCount} cevap`,
    });
  }

  // Outcomes (kazanım)
  if (input.outcomeMissingCount > 0) {
    r.push({
      id: "outcomes",
      label: "Tüm sorular için kazanım atanmış",
      level: "error",
      detail: `${input.outcomeMissingCount} soru için kazanım eksik.`,
    });
  } else if (input.outcomeReadyCount > 0) {
    r.push({
      id: "outcomes",
      label: "Tüm sorular için kazanım atanmış",
      level: "ok",
      detail: `${input.outcomeReadyCount} kazanım atandı`,
    });
  } else {
    r.push({
      id: "outcomes",
      label: "Kazanım atanmamış",
      level: "error",
      detail: "Önce cevap anahtarı yükleyin, sonra kazanım atayın.",
    });
  }

  r.push({
    id: "access-tags",
    label: "En az 1 erişim tagı bağlı",
    level: input.accessTagCount > 0 ? "ok" : "error",
    detail:
      input.accessTagCount > 0
        ? `${input.accessTagCount} tag bağlı`
        : "Etiket olmadan öğrenciler bu denemeye erişemez.",
  });

  // Informational warnings.
  if (input.attemptCount > 0 && input.status === "DRAFT") {
    r.push({
      id: "attempts-on-draft",
      label: "Mevcut çözümler var",
      level: "warn",
      detail: `${input.attemptCount} çözüm kaydı mevcut. Yayınlama / arşivleme bunları silmez.`,
    });
  }

  let overall: ReadinessLevel = "ok";
  for (const rule of r) {
    if (rule.level === "error") {
      overall = "error";
      break;
    }
    if (rule.level === "warn") overall = "warn";
  }

  return {
    overall,
    publishAllowed: overall !== "error",
    rules: r,
  };
}

/**
 * Same as the gate inside `publish/route.ts`, but returned as a flat list of
 * blocking issues so it can be surfaced inline by the admin UI.
 */
export function validateOdkExamForPublish(readiness: OdkExamReadiness): string[] {
  return readiness.rules
    .filter((r) => r.level === "error")
    .map((r) => (r.detail ? `${r.label}: ${r.detail}` : r.label));
}

// ─── Type-narrower (dodge stale Prisma client typings) ──────────────────────

type PrismaLike = typeof prisma & Record<string, never>;
const db = prisma as unknown as {
  odkExam: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findUnique: (args: unknown) => Promise<unknown | null>;
    count: (args: unknown) => Promise<number>;
  };
  odkExamSection: { findMany: (args: unknown) => Promise<unknown[]> };
  odkExamFile: { findMany: (args: unknown) => Promise<unknown[]> };
  odkExamOfficialAnswer: {
    count: (args: unknown) => Promise<number>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
  odkExamAccessTag: {
    findMany: (args: unknown) => Promise<unknown[]>;
    count: (args: unknown) => Promise<number>;
  };
  odkUserAccessTag: { count: (args: unknown) => Promise<number> };
  odkExamAttempt: {
    findMany: (args: unknown) => Promise<unknown[]>;
    count: (args: unknown) => Promise<number>;
    aggregate: (args: unknown) => Promise<unknown>;
  };
} & PrismaLike;

// ─── List ───────────────────────────────────────────────────────────────────

export type OdkAdminExamListFilter = {
  search?: string | null;
  status?: OdkExamStatus | "ALL" | null;
  cadence?: OdkExamCadenceFamily | "ALL" | null;
  limit?: number;
};

type RawListExam = {
  id: string;
  title: string;
  slug: string;
  cadenceFamily: OdkExamCadenceFamily;
  classLevel: number | null;
  status: OdkExamStatus;
  durationMinutes: number;
  publishedAt: Date | null;
  createdAt: Date;
  sections: { questionCount: number }[];
  files: { fileType: "BOOKLET_PDF" | "ANSWER_KEY_PDF" }[];
  officialAnswers: { learningOutcomeCode: string | null }[];
  examAccessTags: { id: string }[];
  _count: { attempts: number };
};

export async function getOdkAdminExamList(
  filter: OdkAdminExamListFilter = {},
): Promise<AdminExamListRow[]> {
  const { search, status, cadence, limit = 200 } = filter;

  const where: Record<string, unknown> = {};
  if (status && status !== "ALL") where.status = status;
  if (cadence && cadence !== "ALL") where.cadenceFamily = cadence;
  if (search && search.trim().length > 0) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { slug: { contains: search, mode: "insensitive" } },
    ];
  }

  const exams = (await db.odkExam.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 500),
    include: {
      sections: { select: { questionCount: true } },
      files: { select: { fileType: true } },
      officialAnswers: { select: { learningOutcomeCode: true } },
      examAccessTags: { select: { id: true } },
      _count: { select: { attempts: true } },
    },
  })) as RawListExam[];

  return exams.map((e) => {
    const totalQuestionCount = e.sections.reduce((a, s) => a + s.questionCount, 0);
    const bookletAttached = e.files.some((f) => f.fileType === "BOOKLET_PDF");
    const answerKeyRowCount = e.officialAnswers.length;
    const outcomeReadyCount = e.officialAnswers.filter(
      (a) => !!a.learningOutcomeCode,
    ).length;
    const outcomeMissingCount = answerKeyRowCount - outcomeReadyCount;
    const accessTagCount = e.examAccessTags.length;
    const attemptCount = e._count.attempts;

    const readiness = computeOdkExamReadiness({
      status: e.status,
      durationMinutes: e.durationMinutes,
      sectionCount: e.sections.length,
      totalQuestionCount,
      bookletAttached,
      answerKeyRowCount,
      outcomeReadyCount,
      outcomeMissingCount,
      accessTagCount,
      attemptCount,
    });

    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      cadenceFamily: e.cadenceFamily,
      classLevel: e.classLevel,
      status: e.status,
      durationMinutes: e.durationMinutes,
      publishedAt: e.publishedAt,
      createdAt: e.createdAt,
      sectionCount: e.sections.length,
      totalQuestionCount,
      bookletAttached,
      answerKeyRowCount,
      outcomeReadyCount,
      outcomeMissingCount,
      accessTagCount,
      attemptCount,
      readiness,
    };
  });
}

// ─── Section table ──────────────────────────────────────────────────────────

type RawSection = {
  id: string;
  examId: string;
  orderIndex: number;
  title: string;
  questionCount: number;
};

type RawOfficialAnswer = {
  questionNumber: number;
  sectionId: string;
  learningOutcomeCode: string | null;
};

export async function getOdkExamSections(examId: string): Promise<AdminExamSectionRow[]> {
  const [sectionsRaw, answers] = await Promise.all([
    db.odkExamSection.findMany({
      where: { examId },
      orderBy: { orderIndex: "asc" },
    }) as Promise<RawSection[]>,
    db.odkExamOfficialAnswer.findMany({
      where: { examId },
      select: { questionNumber: true, sectionId: true, learningOutcomeCode: true },
    }) as Promise<RawOfficialAnswer[]>,
  ]);

  // Per-section bucketing uses sectionId (authoritative). Question-number
  // ranges are not stored explicitly so we trust the FK.
  return sectionsRaw.map((s) => {
    const inSection = answers.filter((a) => a.sectionId === s.id);
    const answerCount = inSection.length;
    const outcomeReadyCount = inSection.filter((a) => !!a.learningOutcomeCode).length;
    return {
      id: s.id,
      orderIndex: s.orderIndex,
      title: s.title,
      questionCount: s.questionCount,
      answerCount,
      outcomeReadyCount,
      missingAnswerCount: Math.max(0, s.questionCount - answerCount),
      missingOutcomeCount: Math.max(0, s.questionCount - outcomeReadyCount),
    };
  });
}

// ─── Answer-key + access summaries ──────────────────────────────────────────

export async function getOdkExamAnswerKeySummary(examId: string): Promise<{
  totalQuestionCount: number;
  answerKeyRowCount: number;
  outcomeReadyCount: number;
  outcomeMissingCount: number;
}> {
  const sections = (await db.odkExamSection.findMany({
    where: { examId },
    select: { questionCount: true },
  })) as { questionCount: number }[];
  const totalQuestionCount = sections.reduce((a, s) => a + s.questionCount, 0);
  const [answerKeyRowCount, outcomeReadyCount] = await Promise.all([
    db.odkExamOfficialAnswer.count({ where: { examId } }),
    db.odkExamOfficialAnswer.count({
      where: { examId, learningOutcomeCode: { not: null } },
    }),
  ]);
  return {
    totalQuestionCount,
    answerKeyRowCount,
    outcomeReadyCount,
    outcomeMissingCount: Math.max(0, answerKeyRowCount - outcomeReadyCount),
  };
}

type RawAccessTagRow = {
  id: string;
  accessTagId: string;
  accessTag: {
    id: string;
    key: string;
    title: string;
    description: string | null;
    isActive: boolean;
    _count: { userTags: number };
  };
};

export async function getOdkExamAccessSummary(
  examId: string,
): Promise<AdminExamAccessSummary> {
  const links = (await db.odkExamAccessTag.findMany({
    where: { examId },
    include: {
      accessTag: {
        select: {
          id: true,
          key: true,
          title: true,
          description: true,
          isActive: true,
          _count: { select: { userTags: { where: { revokedAt: null } } } },
        },
      },
    },
  })) as RawAccessTagRow[];

  const tags = links.map((l) => ({
    id: l.accessTag.id,
    key: l.accessTag.key,
    title: l.accessTag.title,
    description: l.accessTag.description,
    isActive: l.accessTag.isActive,
    grantedUserCount: l.accessTag._count.userTags,
  }));

  // grantedUserCount per tag may overlap across tags; we still surface the
  // sum as a coarse upper bound. Distinct count requires a heavier query;
  // deferred — admin can deep-dive via /panel/admin/odk/erisim.
  return {
    tagCount: tags.length,
    grantedUserCount: tags.reduce((a, t) => a + t.grantedUserCount, 0),
    tags,
  };
}

// ─── Attempt summary ────────────────────────────────────────────────────────

type RawAttempt = {
  id: string;
  userId: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "ABANDONED";
  startedAt: Date | null;
  submittedAt: Date | null;
  score: { toNumber: () => number } | number | null;
  cheatViolationCount: number;
  suspiciousScore: number | null;
  autoSubmitted: boolean;
  user: { name: string | null; email: string | null } | null;
};

export async function getOdkExamAttemptSummary(
  examId: string,
): Promise<AdminExamAttemptSummary> {
  const [
    totalCount,
    inProgressCount,
    submittedCount,
    abandonedCount,
    flaggedCount,
    avgAgg,
    recentRaw,
  ] = await Promise.all([
    db.odkExamAttempt.count({ where: { examId } }),
    db.odkExamAttempt.count({ where: { examId, status: "IN_PROGRESS" } }),
    db.odkExamAttempt.count({ where: { examId, status: "SUBMITTED" } }),
    db.odkExamAttempt.count({ where: { examId, status: "ABANDONED" } }),
    db.odkExamAttempt.count({
      where: { examId, cheatViolationCount: { gt: 0 } },
    }),
    db.odkExamAttempt.aggregate({
      _avg: { score: true },
      where: { examId, status: "SUBMITTED" },
    }) as Promise<{ _avg: { score: { toNumber: () => number } | number | null } }>,
    db.odkExamAttempt.findMany({
      where: { examId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        userId: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        score: true,
        cheatViolationCount: true,
        suspiciousScore: true,
        autoSubmitted: true,
        user: { select: { name: true, email: true } },
      },
    }) as Promise<RawAttempt[]>,
  ]);

  const avgRaw = avgAgg._avg.score;
  const averageScore =
    avgRaw == null
      ? null
      : typeof avgRaw === "number"
        ? avgRaw
        : avgRaw.toNumber();

  return {
    totalCount,
    inProgressCount,
    submittedCount,
    abandonedCount,
    flaggedCount,
    averageScore,
    recent: recentRaw.map((a) => {
      const score =
        a.score == null
          ? null
          : typeof a.score === "number"
            ? a.score
            : a.score.toNumber();
      return {
        id: a.id,
        userId: a.userId,
        userName: a.user?.name ?? "—",
        userEmail: a.user?.email ?? null,
        status: a.status,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
        score,
        cheatViolationCount: a.cheatViolationCount,
        suspiciousScore: a.suspiciousScore,
        autoSubmitted: a.autoSubmitted,
      };
    }),
  };
}

// ─── Detail composer ────────────────────────────────────────────────────────

type RawExamDetail = {
  id: string;
  title: string;
  slug: string;
  status: OdkExamStatus;
  cadenceFamily: OdkExamCadenceFamily;
  classLevel: number | null;
  durationMinutes: number;
  description: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  sections: { questionCount: number }[];
  files: { fileType: "BOOKLET_PDF" | "ANSWER_KEY_PDF" }[];
  examAccessTags: { id: string }[];
  _count: { attempts: number };
};

export async function getOdkAdminExamDetail(
  examId: string,
): Promise<AdminExamDetail | null> {
  const exam = (await db.odkExam.findUnique({
    where: { id: examId },
    include: {
      sections: { select: { questionCount: true } },
      files: { select: { fileType: true } },
      examAccessTags: { select: { id: true } },
      _count: { select: { attempts: true } },
    },
  })) as RawExamDetail | null;
  if (!exam) return null;

  const [sectionRows, accessSummary, attemptSummary, ansSummary] = await Promise.all([
    getOdkExamSections(examId),
    getOdkExamAccessSummary(examId),
    getOdkExamAttemptSummary(examId),
    getOdkExamAnswerKeySummary(examId),
  ]);

  const totalQuestionCount = ansSummary.totalQuestionCount;
  const bookletAttached = exam.files.some((f) => f.fileType === "BOOKLET_PDF");
  const answerKeyAttached = exam.files.some((f) => f.fileType === "ANSWER_KEY_PDF");

  const readiness = computeOdkExamReadiness({
    status: exam.status,
    durationMinutes: exam.durationMinutes,
    sectionCount: exam.sections.length,
    totalQuestionCount,
    bookletAttached,
    answerKeyRowCount: ansSummary.answerKeyRowCount,
    outcomeReadyCount: ansSummary.outcomeReadyCount,
    outcomeMissingCount: ansSummary.outcomeMissingCount,
    accessTagCount: exam.examAccessTags.length,
    attemptCount: exam._count.attempts,
  });

  return {
    id: exam.id,
    title: exam.title,
    slug: exam.slug,
    status: exam.status,
    cadenceFamily: exam.cadenceFamily,
    classLevel: exam.classLevel,
    durationMinutes: exam.durationMinutes,
    description: exam.description,
    publishedAt: exam.publishedAt,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    bookletAttached,
    answerKeyAttached,
    totalQuestionCount,
    answerKeyRowCount: ansSummary.answerKeyRowCount,
    outcomeReadyCount: ansSummary.outcomeReadyCount,
    outcomeMissingCount: ansSummary.outcomeMissingCount,
    sections: sectionRows,
    access: accessSummary,
    attempts: attemptSummary,
    readiness,
  };
}

// ─── Single-shot readiness loader ───────────────────────────────────────────

export async function getOdkExamReadiness(examId: string): Promise<OdkExamReadiness | null> {
  const detail = await getOdkAdminExamDetail(examId);
  return detail?.readiness ?? null;
}
