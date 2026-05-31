/**
 * Student-facing ODK helpers — Phase 2 / Session 8.
 *
 * Centralizes access checks, summary, attempts, result detail and
 * deterministic weak-signal recommendations for the ODK student surface.
 *
 * Permission boundary
 *   - Student   → own attempts only.
 *   - Admin     → bypass.
 *   - Teacher / Parent → out of scope; this module is for the student panel.
 *
 * Net calculation policy
 *   - For SUBMITTED attempts we **prefer the stored values** on
 *     `OdkExamAttempt` (`score`, `correctCount`, `wrongCount`, `blankCount`
 *     and `sectionScores` JSON). Re-scoring is intentionally avoided so
 *     historical attempts cannot silently change after answer-key edits.
 *   - When `score` is null, the helper derives a fallback net from
 *     `correctCount - wrongCount/4` (ÖSYM convention, matches
 *     `lib/odk/scoring.ts`). This is purely a display fallback — the
 *     stored `score` value remains the source of truth on persistence.
 *
 * No AI calls. No fake data. Honest empty states.
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { canStudentAccessExam } from "@/lib/access/odk";
import type {
  OdkExamCadenceFamily,
  OdkAttemptStatus,
  Prisma,
} from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type OdkStudentContext = {
  userId: string;
  /** "ADMIN" | "STUDENT" — used to bypass tag checks in admin view-as. */
  actualRole: string;
  /** Active access-tag ids; empty = no published exams visible. */
  activeTagIds: string[];
};

export type OdkAvailableExam = {
  id: string;
  title: string;
  slug: string;
  cadenceFamily: OdkExamCadenceFamily;
  classLevel: string | null;
  durationMinutes: number;
  publishedAt: Date | null;
  startsAt: Date | null;
  endsAt: Date | null;
  totalQuestions: number;
  /** "AVAILABLE" | "IN_PROGRESS" | "COMPLETED" | "EXPIRED" | "NOT_YET" */
  status:
    | "AVAILABLE"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "EXPIRED"
    | "NOT_YET";
  /** Latest attempt id if any (used by status badge / CTA). */
  lastAttemptId: string | null;
  lastAttemptStatus: OdkAttemptStatus | null;
  lastAttemptScore: number | null;
};

export type OdkAttemptRow = {
  id: string;
  examId: string;
  examTitle: string;
  cadenceFamily: OdkExamCadenceFamily;
  status: OdkAttemptStatus;
  startedAt: Date;
  submittedAt: Date | null;
  durationSeconds: number | null;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  /** Stored net (preferred). Falls back to computed when null. */
  net: number | null;
  autoSubmitted: boolean;
  cheatViolationCount: number;
};

export type OdkSectionScore = {
  sectionId: string;
  title: string;
  questionCount: number;
  correct: number;
  wrong: number;
  blank: number;
  net: number;
};

export type OdkPerQuestionRow = {
  sectionId: string;
  questionNumber: number;
  selected: string | null;
  correct: string;
  isCorrect: boolean;
  isBlank: boolean;
};

export type OdkResultDetail = {
  attemptId: string;
  examId: string;
  examTitle: string;
  cadenceFamily: OdkExamCadenceFamily;
  classLevel: string | null;
  durationMinutes: number;
  durationSeconds: number | null;
  startedAt: Date;
  submittedAt: Date | null;
  status: OdkAttemptStatus;
  correctCount: number;
  wrongCount: number;
  blankCount: number;
  totalQuestions: number;
  net: number | null;
  autoSubmitted: boolean;
  cheatViolationCount: number;
  sections: OdkSectionScore[];
  perQuestion: OdkPerQuestionRow[];
};

export type OdkTrendPoint = {
  attemptId: string;
  takenAt: Date;
  examTitle: string;
  net: number | null;
  href: string;
};

export type OdkWeakSignalTone = "bad" | "warn" | "neutral" | "ok";

export type OdkWeakSignal = {
  id: string;
  title: string;
  reason: string;
  tone: OdkWeakSignalTone;
  href: string | null;
  cta: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

const PENALTY = 4;
const SUSP_PUBLIC_THRESHOLD = 2; // student sees the chip only past this many
                                 // logged violations — matches existing UI.

function num(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Stored net wins; fallback to computed; never re-scores. */
function netOf(a: {
  score: Prisma.Decimal | null;
  correctCount: number;
  wrongCount: number;
}): number | null {
  const stored = num(a.score);
  if (stored != null) return stored;
  return r2(a.correctCount - a.wrongCount / PENALTY);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1) Context
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentOdkContext(
  userId: string,
  actualRole: string,
): Promise<OdkStudentContext> {
  const tagRows = await prisma.odkUserAccessTag.findMany({
    where: {
      userId,
      revokedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      accessTag: { isActive: true, service: "ODK" },
    },
    select: { accessTagId: true },
  });
  return {
    userId,
    actualRole,
    activeTagIds: tagRows.map((r) => r.accessTagId),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) Access guards
// ─────────────────────────────────────────────────────────────────────────────

/** Convenience wrapper around `canStudentAccessExam` for parity. */
export async function canStudentAccessOdkExam(
  userId: string,
  role: string,
  examId: string,
): Promise<boolean> {
  return canStudentAccessExam(
    userId,
    role as Parameters<typeof canStudentAccessExam>[1],
    examId,
  );
}

/**
 * Owner-or-admin guard. Returns true when the requesting user owns the
 * attempt or is admin. Does NOT throw — call site decides redirect/notFound.
 */
export async function canStudentViewOdkAttempt(
  userId: string,
  role: string,
  attemptId: string,
): Promise<boolean> {
  if (role === "ADMIN") return true;
  const a = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: { userId: true },
  });
  return !!a && a.userId === userId;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) Available exams
// ─────────────────────────────────────────────────────────────────────────────

export async function getAvailableOdkExamsForStudent(
  ctx: OdkStudentContext,
): Promise<OdkAvailableExam[]> {
  const isAdmin = ctx.actualRole === "ADMIN";
  if (!isAdmin && ctx.activeTagIds.length === 0) return [];

  const where: Prisma.OdkExamWhereInput = isAdmin
    ? { status: "PUBLISHED" }
    : {
        status: "PUBLISHED",
        examAccessTags: { some: { accessTagId: { in: ctx.activeTagIds } } },
      };

  const exams = await prisma.odkExam.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      cadenceFamily: true,
      classLevel: true,
      durationMinutes: true,
      publishedAt: true,
      startsAt: true,
      endsAt: true,
      sections: { select: { questionCount: true } },
      attempts: {
        where: { userId: ctx.userId },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          score: true,
          correctCount: true,
          wrongCount: true,
        },
      },
    },
  });

  const now = Date.now();
  return exams.map((e): OdkAvailableExam => {
    const totalQuestions = e.sections.reduce((s, x) => s + x.questionCount, 0);
    const last = e.attempts[0] ?? null;
    let status: OdkAvailableExam["status"];
    if (last?.status === "IN_PROGRESS") {
      status = "IN_PROGRESS";
    } else if (last?.status === "SUBMITTED") {
      status = "COMPLETED";
    } else if (e.endsAt && e.endsAt.getTime() < now) {
      status = "EXPIRED";
    } else if (e.startsAt && e.startsAt.getTime() > now) {
      status = "NOT_YET";
    } else {
      status = "AVAILABLE";
    }
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      cadenceFamily: e.cadenceFamily,
      classLevel: e.classLevel,
      durationMinutes: e.durationMinutes,
      publishedAt: e.publishedAt,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
      totalQuestions,
      status,
      lastAttemptId: last?.id ?? null,
      lastAttemptStatus: last?.status ?? null,
      lastAttemptScore: last ? netOf(last) : null,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) Attempts list (recent or full)
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentOdkAttempts(
  userId: string,
  opts: { take?: number; onlySubmitted?: boolean } = {},
): Promise<OdkAttemptRow[]> {
  const take = opts.take ?? 30;
  const where: Prisma.OdkExamAttemptWhereInput = { userId };
  if (opts.onlySubmitted) where.status = "SUBMITTED";

  const rows = await prisma.odkExamAttempt.findMany({
    where,
    orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
    take,
    select: {
      id: true,
      examId: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      durationSeconds: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      autoSubmitted: true,
      cheatViolationCount: true,
      exam: { select: { title: true, cadenceFamily: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    examId: r.examId,
    examTitle: r.exam.title,
    cadenceFamily: r.exam.cadenceFamily,
    status: r.status,
    startedAt: r.startedAt,
    submittedAt: r.submittedAt,
    durationSeconds: r.durationSeconds,
    correctCount: r.correctCount,
    wrongCount: r.wrongCount,
    blankCount: r.blankCount,
    net: netOf(r),
    autoSubmitted: r.autoSubmitted,
    cheatViolationCount: r.cheatViolationCount,
  }));
}

export async function getStudentOdkLatestResult(
  userId: string,
): Promise<OdkAttemptRow | null> {
  const rows = await getStudentOdkAttempts(userId, {
    take: 1,
    onlySubmitted: true,
  });
  return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5) Result detail (for the result page)
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentOdkResultDetail(
  attemptId: string,
): Promise<OdkResultDetail | null> {
  const a = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      examId: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      durationSeconds: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      blankCount: true,
      sectionScores: true,
      resultPayload: true,
      autoSubmitted: true,
      cheatViolationCount: true,
      exam: {
        select: {
          id: true,
          title: true,
          cadenceFamily: true,
          classLevel: true,
          durationMinutes: true,
        },
      },
    },
  });
  if (!a) return null;

  const sections: OdkSectionScore[] =
    (a.sectionScores as unknown as OdkSectionScore[] | null) ?? [];
  const perQuestion: OdkPerQuestionRow[] =
    ((a.resultPayload as { perQuestion?: OdkPerQuestionRow[] } | null)
      ?.perQuestion) ?? [];
  const totalQuestions =
    a.correctCount + a.wrongCount + a.blankCount;

  return {
    attemptId: a.id,
    examId: a.examId,
    examTitle: a.exam.title,
    cadenceFamily: a.exam.cadenceFamily,
    classLevel: a.exam.classLevel,
    durationMinutes: a.exam.durationMinutes,
    durationSeconds: a.durationSeconds,
    startedAt: a.startedAt,
    submittedAt: a.submittedAt,
    status: a.status,
    correctCount: a.correctCount,
    wrongCount: a.wrongCount,
    blankCount: a.blankCount,
    totalQuestions,
    net: netOf(a),
    autoSubmitted: a.autoSubmitted,
    cheatViolationCount: a.cheatViolationCount,
    sections,
    perQuestion,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6) Trend (linkable)
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentOdkNetTrend(
  userId: string,
  take = 10,
): Promise<OdkTrendPoint[]> {
  const rows = await prisma.odkExamAttempt.findMany({
    where: { userId, status: "SUBMITTED" },
    orderBy: { submittedAt: "desc" },
    take,
    select: {
      id: true,
      submittedAt: true,
      score: true,
      correctCount: true,
      wrongCount: true,
      exam: { select: { title: true } },
    },
  });
  return rows
    .filter((r) => r.submittedAt)
    .map(
      (r): OdkTrendPoint => ({
        attemptId: r.id,
        takenAt: r.submittedAt as Date,
        examTitle: r.exam.title,
        net: netOf(r),
        href: `/panel/ogrenci/odk/sonuc/${r.id}`,
      }),
    )
    .reverse(); // oldest → newest
}

// ─────────────────────────────────────────────────────────────────────────────
// 7) Section breakdown for a single attempt
// ─────────────────────────────────────────────────────────────────────────────

export async function getStudentOdkSectionBreakdown(
  attemptId: string,
): Promise<OdkSectionScore[]> {
  const a = await prisma.odkExamAttempt.findUnique({
    where: { id: attemptId },
    select: { sectionScores: true },
  });
  return (a?.sectionScores as unknown as OdkSectionScore[] | null) ?? [];
}

// ─────────────────────────────────────────────────────────────────────────────
// 8) Weak signals — deterministic, derived from real data
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate up to ~5 deterministic suggestions for a single attempt.
 * Rules — ordered later by tone (bad → warn → neutral → ok), capped at 5:
 *
 *  W1  Lowest-net section with net < 5            → bad   "X bölümünü çalış"
 *  W2  Section with wrong > correct (and >= 4 q)  → warn  "X yanlış sayın yüksek"
 *  W3  Section blank-rate > 50% with >= 4 q       → warn  "X süre yönetimi"
 *  W4  Auto-submitted attempt                     → warn  "Süre yönetimi"
 *  W5  cheatViolationCount > 0                    → warn  "Sınav kuralları"
 *  W6  Empty fallback                             → ok    "İyi gidiyor"
 *
 * Multi-attempt rule (only when `recentAttempts` is supplied):
 *  W7  Same section is the lowest in ≥ 2 of last  → bad   "Tekrarlayan zayıf"
 *      3 submitted attempts
 */
export function getStudentOdkWeakSignals(
  detail: OdkResultDetail,
  recentAttempts: OdkAttemptRow[] = [],
  recentSectionScoresByAttempt: Map<string, OdkSectionScore[]> = new Map(),
): OdkWeakSignal[] {
  const out: OdkWeakSignal[] = [];

  // Sort sections by net ascending for "lowest"
  const sections = detail.sections;
  if (sections.length > 0) {
    const sorted = [...sections].sort((a, b) => a.net - b.net);
    const lowest = sorted[0];

    if (lowest && lowest.questionCount >= 4 && lowest.net < 5) {
      out.push({
        id: `weak:lowestNet:${lowest.sectionId}`,
        title: `${lowest.title} dersine odaklan`,
        reason: `Bu denemede ${lowest.title} netin: ${lowest.net.toFixed(2)}.`,
        tone: "bad",
        href: "/panel/ogrenci/kutuphane",
        cta: "Materyalleri aç",
      });
    }

    for (const s of sections) {
      if (s.questionCount < 4) continue;
      // Wrong-heavy
      if (s.wrong > s.correct) {
        out.push({
          id: `weak:wrongHeavy:${s.sectionId}`,
          title: `${s.title} bölümünde yanlış sayın yüksek`,
          reason: `${s.title}: ${s.correct} doğru / ${s.wrong} yanlış.`,
          tone: "warn",
          href: "/panel/ogrenci/kutuphane",
          cta: "Konuyu çalış",
        });
      }
      // Blank-heavy
      if (s.blank / s.questionCount > 0.5) {
        out.push({
          id: `weak:blankHeavy:${s.sectionId}`,
          title: `${s.title} bölümünde boş sayın fazla`,
          reason: `${s.title}: ${s.blank}/${s.questionCount} soru boş kaldı. Önce süre yönetimi çalışması yap.`,
          tone: "warn",
          href: "/panel/ogrenci/calisma-odasi",
          cta: "Çalışma başlat",
        });
      }
    }
  }

  // Auto-submit hint (suggests time management)
  if (detail.autoSubmitted) {
    out.push({
      id: "weak:autoSubmit",
      title: "Bu deneme otomatik gönderildi",
      reason:
        "Süre dolduğunda veya bir kural tetiklendiğinde sınav otomatik teslim alındı. Süre yönetimi çalışması yapmak işe yarar.",
      tone: "warn",
      href: "/panel/ogrenci/calisma-odasi",
      cta: "Çalışma başlat",
    });
  }

  // Cheat violation chip — only if past the public threshold (matches UI)
  if (detail.cheatViolationCount >= SUSP_PUBLIC_THRESHOLD) {
    out.push({
      id: "weak:violations",
      title: "Sınav sırasında kural ihlali tespit edildi",
      reason: `Bu denemede ${detail.cheatViolationCount} ihlal kayda alındı. Bir sonraki denemede tam ekranda kal ve sekme değiştirme.`,
      tone: "warn",
      href: null,
      cta: null,
    });
  }

  // Multi-attempt repeated weakness
  if (recentAttempts.length >= 2) {
    const lowestPerAttempt = new Map<string, string>(); // attemptId -> section title
    for (const r of recentAttempts.slice(0, 3)) {
      const ss = recentSectionScoresByAttempt.get(r.id);
      if (!ss || ss.length === 0) continue;
      const lo = [...ss].sort((a, b) => a.net - b.net)[0];
      if (lo) lowestPerAttempt.set(r.id, lo.title);
    }
    const counts = new Map<string, number>();
    for (const t of lowestPerAttempt.values()) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    for (const [title, c] of counts) {
      if (c >= 2) {
        out.push({
          id: `weak:repeated:${title}`,
          title: `Tekrarlayan zayıf: ${title}`,
          reason: `Son ${lowestPerAttempt.size} denemenin ${c}'sinde ${title} en düşük netin oldu. Akademik yol haritanda bu alanı önceliklendir.`,
          tone: "bad",
          href: "/panel/ogrenci/hedefim",
          cta: "Yol haritasını aç",
        });
        break; // single repeated signal is enough
      }
    }
  }

  // Empty fallback
  if (out.length === 0) {
    out.push({
      id: "weak:keep",
      title: "Önemli bir zayıf sinyal görünmüyor",
      reason:
        "Bu deneme için belirgin bir zayıf bölüm tespit edilmedi. Bir sonraki denemeye odaklan.",
      tone: "ok",
      href: "/panel/ogrenci/odk/denemeler",
      cta: "Denemelere git",
    });
  }

  // Tone ordering, cap 5
  const order: Record<OdkWeakSignalTone, number> = {
    bad: 0,
    warn: 1,
    neutral: 2,
    ok: 3,
  };
  out.sort((a, b) => order[a.tone] - order[b.tone]);

  // De-duplicate by id (recent-weakness might collide with current-weakness)
  const seen = new Set<string>();
  const dedup: OdkWeakSignal[] = [];
  for (const s of out) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    dedup.push(s);
  }
  return dedup.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// 9) Compact summary for the index page
// ─────────────────────────────────────────────────────────────────────────────

export type OdkStudentSummary = {
  availableCount: number;
  inProgressAttempt: { id: string; examTitle: string } | null;
  completedCount: number;
  latestNet: number | null;
  bestNet: number | null;
  hasNewAvailable: boolean;
};

export async function getStudentOdkSummary(
  userId: string,
  actualRole: string,
): Promise<OdkStudentSummary> {
  const ctx = await getStudentOdkContext(userId, actualRole);
  const [available, attempts, inProgress] = await Promise.all([
    getAvailableOdkExamsForStudent(ctx),
    getStudentOdkAttempts(userId, { take: 50, onlySubmitted: true }),
    prisma.odkExamAttempt.findFirst({
      where: { userId, status: "IN_PROGRESS" },
      orderBy: { startedAt: "desc" },
      select: { id: true, exam: { select: { title: true } } },
    }),
  ]);

  const availableCount = available.filter(
    (e) => e.status === "AVAILABLE" || e.status === "IN_PROGRESS",
  ).length;
  const completedCount = attempts.length;
  const validNets = attempts
    .map((a) => a.net)
    .filter((v): v is number => v != null);
  const latestNet = attempts[0]?.net ?? null;
  const bestNet =
    validNets.length > 0 ? Math.max(...validNets) : null;
  const hasNewAvailable = available.some(
    (e) => e.status === "AVAILABLE" && !e.lastAttemptId,
  );

  return {
    availableCount,
    inProgressAttempt: inProgress
      ? { id: inProgress.id, examTitle: inProgress.exam.title }
      : null,
    completedCount,
    latestNet,
    bestNet,
    hasNewAvailable,
  };
}
