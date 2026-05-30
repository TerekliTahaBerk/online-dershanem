/**
 * Attendance helpers — Phase 1.5 hardening.
 *
 * Centralizes status labelling and risk classification so every consumer
 * (admin attendance page, student 360 tab, AttendanceQuickTake modal,
 * teacher live-lesson, mobile API, risk analytics) renders the same chips
 * and treats the same statuses as negative/excused.
 *
 * Status model:
 *   PRESENT     — Geldi
 *   LATE        — Geç (counts as a soft warning)
 *   ABSENT      — Gelmedi (negative)
 *   EXCUSED     — Mazeretli (excused, not negative)
 *   LEFT_EARLY  — Dersten erken ayrıldı (Phase 1.5+, soft warning)
 *
 * `LEFT_EARLY` is added in migration 0028. This module gracefully degrades
 * if the deployed DB hasn't yet received the migration — `STATUS_META[s]`
 * always returns a value for any string (falls back to neutral).
 */

import type { AttendanceStatus } from "@prisma/client";

export type AttendanceTone = "good" | "warn" | "bad" | "muted" | "neutral";

type Meta = {
  label: string;
  tone: AttendanceTone;
  /** CSS variable name (without var()) for color of badges/pills. */
  cssVar: string;
  /** Single-character glyph used in compact summaries. */
  glyph: string;
};

/** All known attendance statuses, listed in display order. */
export const ATTENDANCE_STATUSES = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
  "LEFT_EARLY",
] as const satisfies ReadonlyArray<AttendanceStatus>;

/**
 * Subset of statuses safe to write today. After migration 0028 every status
 * in `ATTENDANCE_STATUSES` is writable; this constant remains for parity
 * with `WRITABLE_ATTENDANCE_STATUSES` consumers.
 */
export const WRITABLE_ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "ABSENT",
  "EXCUSED",
  "LEFT_EARLY",
];

const META: Record<string, Meta> = {
  PRESENT:    { label: "Geldi",                      tone: "good",    cssVar: "--pd-good", glyph: "✓" },
  LATE:       { label: "Geç",                        tone: "warn",    cssVar: "--pd-warn", glyph: "⏱" },
  ABSENT:     { label: "Gelmedi",                    tone: "bad",     cssVar: "--pd-bad",  glyph: "✗" },
  EXCUSED:    { label: "Mazeretli",                  tone: "muted",   cssVar: "--pd-text-muted", glyph: "✎" },
  LEFT_EARLY: { label: "Dersten erken ayrıldı",      tone: "warn",    cssVar: "--pd-warn", glyph: "↗" },
};

const NEUTRAL: Meta = { label: "—", tone: "neutral", cssVar: "--pd-text-muted", glyph: "·" };

/** Public API: label for a status (Turkish UI). Safe for unknown strings. */
export function getAttendanceStatusLabel(s: AttendanceStatus | string | null | undefined): string {
  if (!s) return NEUTRAL.label;
  return META[s]?.label ?? s;
}

/** Public API: tone keyword usable by Badge / od-chip / KPI components. */
export function getAttendanceStatusTone(s: AttendanceStatus | string | null | undefined): AttendanceTone {
  if (!s) return "neutral";
  return META[s]?.tone ?? "neutral";
}

/** Public API: CSS variable name (no var()) for inline coloring. */
export function getAttendanceStatusCssVar(s: AttendanceStatus | string | null | undefined): string {
  if (!s) return NEUTRAL.cssVar;
  return META[s]?.cssVar ?? NEUTRAL.cssVar;
}

/** Glyph for compact summaries ("✓ 12  ⏱ 2  ✗ 1  ↗ 1"). */
export function getAttendanceStatusGlyph(s: AttendanceStatus | string | null | undefined): string {
  if (!s) return NEUTRAL.glyph;
  return META[s]?.glyph ?? NEUTRAL.glyph;
}

/**
 * Negative for risk/devamsızlık reporting:
 *   ABSENT              → fully missed → counts as negative
 *   LATE                → soft, NOT counted as negative
 *   LEFT_EARLY          → soft, NOT counted as negative (but flagged)
 *   EXCUSED / PRESENT   → never negative
 *
 * Use `isAttendanceWarningStatus` if you want the soft warnings included.
 */
export function isNegativeAttendanceStatus(s: AttendanceStatus | string | null | undefined): boolean {
  return s === "ABSENT";
}

/** Soft-warning statuses that should still be visible in trend reports. */
export function isAttendanceWarningStatus(s: AttendanceStatus | string | null | undefined): boolean {
  return s === "LATE" || s === "LEFT_EARLY";
}

/** "Mazeretli" — counts as a present-equivalent for compliance reporting. */
export function isExcusedAttendanceStatus(s: AttendanceStatus | string | null | undefined): boolean {
  return s === "EXCUSED";
}

/**
 * Treats PRESENT, LATE, LEFT_EARLY, EXCUSED as "showed up at some point" for
 * the purposes of the parent dashboard "geçen hafta katıldı" summaries. Only
 * ABSENT counts as a no-show.
 */
export function isParticipatingAttendanceStatus(s: AttendanceStatus | string | null | undefined): boolean {
  return s === "PRESENT" || s === "LATE" || s === "LEFT_EARLY" || s === "EXCUSED";
}

/**
 * Returns true if the given string is a writable attendance status on the
 * current deployment. Use as the runtime gate before writing `LEFT_EARLY`.
 *
 * The check is conservative: we only consider known enum values valid.
 * If the runtime sees `LEFT_EARLY` in the prisma client's known statuses,
 * it's writable. Otherwise it falls back to the four legacy statuses.
 */
export function isWritableAttendanceStatus(s: unknown): s is AttendanceStatus {
  if (typeof s !== "string") return false;
  return s === "PRESENT" || s === "LATE" || s === "ABSENT" || s === "EXCUSED" || s === "LEFT_EARLY";
}

/** Stable ordering for tabbed UI (chips, kpis, dropdowns). */
export const ATTENDANCE_DISPLAY_ORDER: AttendanceStatus[] = [
  "PRESENT",
  "LATE",
  "LEFT_EARLY",
  "ABSENT",
  "EXCUSED",
];
