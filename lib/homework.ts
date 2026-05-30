/**
 * Homework / assignment operational status — Phase 1.5 hardening.
 *
 * The DB enum `AssignmentStatus` only models lifecycle (DRAFT/PUBLISHED/CLOSED).
 * Operationally, the panel needs richer states derived from the submission
 * aggregate: "kontrol bekliyor", "kısmen puanlandı", "gecikti", etc.
 *
 * `getAssignmentOperationalStatus` is the single source of truth — every
 * card, table, filter, and analytics rollup must call it instead of
 * computing labels inline.
 */

import type { AssignmentStatus, SubmissionStatus } from "@prisma/client";

export type AssignmentOperationalStatus =
  | "DRAFT"          // unpublished
  | "ARCHIVED"       // CLOSED + already past due
  | "OVERDUE"        // dueAt passed and missing/ungraded submissions remain
  | "AWAITING_GRADING" // SUBMITTED rows exist, due date may or may not have passed
  | "PARTIALLY_GRADED" // some graded, some still pending/submitted
  | "COMPLETED"      // every expected submission is graded (or LATE-graded)
  | "AWAITING_SUBMISSION" // PUBLISHED, before due date, no submissions yet (or partial)
  | "PUBLISHED";     // PUBLISHED with no other signal — fallback

export type OperationalStatusTone = "ok" | "warn" | "bad" | "neutral" | "teal";

const META: Record<AssignmentOperationalStatus, { label: string; tone: OperationalStatusTone }> = {
  DRAFT:               { label: "Taslak",            tone: "neutral" },
  ARCHIVED:            { label: "Arşiv",             tone: "neutral" },
  OVERDUE:             { label: "Gecikti",           tone: "bad"     },
  AWAITING_GRADING:    { label: "Kontrol bekliyor",  tone: "warn"    },
  PARTIALLY_GRADED:    { label: "Kısmen puanlandı",  tone: "warn"    },
  COMPLETED:           { label: "Tamamlandı",        tone: "ok"      },
  AWAITING_SUBMISSION: { label: "Teslim bekliyor",   tone: "teal"    },
  PUBLISHED:           { label: "Yayında",           tone: "teal"    },
};

export type AssignmentForStatus = {
  status: AssignmentStatus;
  dueAt: Date | null;
};

/** Submission tally — same shape as `SubmissionStats` in homework-board. */
export type AssignmentStatusInput = {
  expected: number;
  pending: number;
  submitted: number;
  graded: number;
  late: number;
  missed: number;
};

/**
 * Derives the operational status of an assignment from its lifecycle status,
 * due date, and submission tally.
 *
 * Decision tree (top-down, first match wins):
 *   1. DRAFT lifecycle             → DRAFT
 *   2. CLOSED lifecycle:
 *        - past due                → ARCHIVED
 *        - not past due            → COMPLETED (closed early = done)
 *   3. expected==0                 → PUBLISHED (nothing to score against)
 *   4. graded == expected          → COMPLETED
 *   5. past due AND missing>0      → OVERDUE
 *   6. submitted>0 AND graded>0    → PARTIALLY_GRADED
 *   7. submitted>0                 → AWAITING_GRADING
 *   8. graded>0                    → PARTIALLY_GRADED  (graded + still pending)
 *   9. before due date             → AWAITING_SUBMISSION
 *  10. fallback                    → PUBLISHED
 */
export function getAssignmentOperationalStatus(
  a: AssignmentForStatus,
  s: AssignmentStatusInput,
  now: Date = new Date(),
): AssignmentOperationalStatus {
  if (a.status === "DRAFT") return "DRAFT";
  const pastDue = !!a.dueAt && a.dueAt.getTime() < now.getTime();
  if (a.status === "CLOSED") {
    return pastDue ? "ARCHIVED" : "COMPLETED";
  }

  // PUBLISHED branch
  if (s.expected <= 0) return "PUBLISHED";
  const totalAccountedFor = s.graded + s.submitted + s.late + s.pending + s.missed;
  if (totalAccountedFor === 0) {
    return pastDue ? "OVERDUE" : "AWAITING_SUBMISSION";
  }
  if (s.graded === s.expected) return "COMPLETED";
  const missingCount = s.missed + Math.max(0, s.expected - totalAccountedFor);
  if (pastDue && missingCount > 0) return "OVERDUE";
  if (s.submitted > 0 && s.graded > 0) return "PARTIALLY_GRADED";
  if (s.submitted > 0) return "AWAITING_GRADING";
  if (s.graded > 0) return "PARTIALLY_GRADED";
  if (!pastDue) return "AWAITING_SUBMISSION";
  return "PUBLISHED";
}

export function getAssignmentStatusLabel(s: AssignmentOperationalStatus): string {
  return META[s].label;
}

export function getAssignmentStatusTone(s: AssignmentOperationalStatus): OperationalStatusTone {
  return META[s].tone;
}

// ── Submission status helpers (already used in student 360 homework tab) ──

const SUB_LABELS: Record<SubmissionStatus, string> = {
  PENDING:   "Beklemede",
  SUBMITTED: "Teslim edildi",
  GRADED:    "Değerlendirildi",
  LATE:      "Geç teslim",
  MISSED:    "Eksik",
};

const SUB_TONES: Record<SubmissionStatus, "ok" | "warn" | "bad" | "neutral"> = {
  PENDING:   "neutral",
  SUBMITTED: "warn",
  GRADED:    "ok",
  LATE:      "warn",
  MISSED:    "bad",
};

export function getSubmissionStatusLabel(s: SubmissionStatus): string {
  return SUB_LABELS[s];
}

export function getSubmissionStatusTone(s: SubmissionStatus): "ok" | "warn" | "bad" | "neutral" {
  return SUB_TONES[s];
}
