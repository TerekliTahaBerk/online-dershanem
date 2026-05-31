/**
 * Phase 2 / Session 15 — ODK admin exam helpers (client-safe display layer).
 *
 * Pure types + label/tone helpers with NO `server-only` marker. The server
 * sibling `lib/panel/odk-admin.ts` re-exports for back-compat and uses
 * `import type` for internal scope.
 */
import type { OdkExamCadenceFamily, OdkExamStatus } from "@prisma/client";

// ─── Status / cadence labels ────────────────────────────────────────────────

const STATUS_LABEL: Record<OdkExamStatus, string> = {
  DRAFT: "Taslak",
  PUBLISHED: "Yayında",
  ARCHIVED: "Arşiv",
};

export function getOdkExamStatusLabel(s: OdkExamStatus): string {
  return STATUS_LABEL[s] ?? String(s);
}

export type OdkExamStatusTone = "ok" | "warn" | "neutral" | "bad";

export function getOdkExamStatusTone(s: OdkExamStatus): OdkExamStatusTone {
  switch (s) {
    case "PUBLISHED":
      return "ok";
    case "DRAFT":
      return "warn";
    case "ARCHIVED":
      return "neutral";
    default:
      return "neutral";
  }
}

const CADENCE_LABEL: Record<OdkExamCadenceFamily, string> = {
  TYT: "TYT",
  AYT: "AYT",
  LGS: "LGS",
  KPSS: "KPSS",
  ALES: "ALES",
};
export function getOdkCadenceLabel(c: OdkExamCadenceFamily): string {
  return CADENCE_LABEL[c] ?? String(c);
}

// ─── Readiness model ────────────────────────────────────────────────────────

/**
 * Each readiness rule produces one of three outcomes.
 * "ok"    — pass.
 * "warn"  — does not block publish; admin should be aware.
 * "error" — blocks publish.
 */
export type ReadinessLevel = "ok" | "warn" | "error";

export type ReadinessRule = {
  id: string;
  label: string;
  level: ReadinessLevel;
  /** Optional explanation surfaced under the label. */
  detail?: string | null;
};

export type OdkExamReadiness = {
  /** Worst level across rules. */
  overall: ReadinessLevel;
  /** True if admin can publish (no `error` rules). */
  publishAllowed: boolean;
  rules: ReadinessRule[];
};

const READINESS_LEVEL_LABEL: Record<ReadinessLevel, string> = {
  ok: "Hazır",
  warn: "Uyarı var",
  error: "Eksik",
};
export function getReadinessLabel(level: ReadinessLevel): string {
  return READINESS_LEVEL_LABEL[level] ?? String(level);
}

export function getReadinessTone(level: ReadinessLevel): OdkExamStatusTone {
  switch (level) {
    case "ok":
      return "ok";
    case "warn":
      return "warn";
    case "error":
      return "bad";
    default:
      return "neutral";
  }
}

// ─── Row shapes (no Prisma values leaked) ───────────────────────────────────

export type AdminExamListRow = {
  id: string;
  title: string;
  slug: string;
  cadenceFamily: OdkExamCadenceFamily;
  classLevel: number | null;
  status: OdkExamStatus;
  durationMinutes: number;
  publishedAt: Date | null;
  createdAt: Date;
  sectionCount: number;
  totalQuestionCount: number;
  bookletAttached: boolean;
  answerKeyRowCount: number;
  outcomeReadyCount: number;
  outcomeMissingCount: number;
  accessTagCount: number;
  attemptCount: number;
  readiness: OdkExamReadiness;
};

export type AdminExamSectionRow = {
  id: string;
  orderIndex: number;
  title: string;
  questionCount: number;
  /** OfficialAnswer rows whose questionNumber falls into this section. */
  answerCount: number;
  /** OfficialAnswer rows with non-null `learningOutcomeCode` in this section. */
  outcomeReadyCount: number;
  missingAnswerCount: number;
  missingOutcomeCount: number;
};

export type AdminExamAccessSummary = {
  tagCount: number;
  /** Total distinct active OdkUserAccessTag grants across attached tags. */
  grantedUserCount: number;
  tags: Array<{
    id: string;
    key: string;
    title: string;
    description: string | null;
    isActive: boolean;
    grantedUserCount: number;
  }>;
};

export type AdminExamAttemptSummary = {
  totalCount: number;
  inProgressCount: number;
  submittedCount: number;
  abandonedCount: number;
  /** Average final score across SUBMITTED attempts. */
  averageScore: number | null;
  /** Attempts with cheatViolationCount > 0. */
  flaggedCount: number;
  /** Latest 10 attempts. */
  recent: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string | null;
    status: string;
    startedAt: Date | null;
    submittedAt: Date | null;
    score: number | null;
    cheatViolationCount: number;
    suspiciousScore: number | null;
    autoSubmitted: boolean;
  }>;
};

export type AdminExamDetail = {
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
  bookletAttached: boolean;
  answerKeyAttached: boolean;
  totalQuestionCount: number;
  answerKeyRowCount: number;
  outcomeReadyCount: number;
  outcomeMissingCount: number;
  sections: AdminExamSectionRow[];
  access: AdminExamAccessSummary;
  attempts: AdminExamAttemptSummary;
  readiness: OdkExamReadiness;
};
