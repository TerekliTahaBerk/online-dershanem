/**
 * Phase 3 / Session 10 — Shared types + pure helpers for the import wizard.
 *
 * This module is **safe to import from client components**. It must not
 * import any server-only code (no Prisma, no `server-only`, no node:fs).
 * The server-only orchestration lives in `lib/panel/imports.ts`.
 */

/** Mirrors `DuplicateMatch` from `lib/panel/account-onboarding.ts`.
 *  Inlined here to keep this module free of any server-only import graph. */
export type ImportDuplicateMatch = {
  field: "phoneKey" | "email" | "user.email" | "phone" | "fullName";
  existingId: string;
  existingLabel: string;
  entity: "Student" | "Parent" | "User" | "Teacher";
};

export type ImportEntity = "students" | "parents" | "teachers";

export const MAX_IMPORT_ROWS = 500;

export type ImportRowStatus = "READY" | "WARNING" | "ERROR" | "SKIPPED_DUPLICATE";

export type ImportRowMessage = {
  field?: string;
  message: string;
};

export type WouldCreateFlags = {
  user: boolean;
  student: boolean;
  parent: boolean;
  teacher: boolean;
  classroomLink: boolean;
  parentLink: boolean;
  invite: boolean;
};

export type ParsedRow = {
  rowNumber: number;
  raw: Record<string, string>;
};

export type ValidatedRow = {
  rowNumber: number;
  raw: Record<string, string>;
  normalized: Record<string, string | null>;
  status: ImportRowStatus;
  errors: ImportRowMessage[];
  warnings: ImportRowMessage[];
  duplicates: ImportDuplicateMatch[];
  wouldCreate: WouldCreateFlags;
};

export type DryRunSummary = {
  total: number;
  ready: number;
  warning: number;
  error: number;
  skipped: number;
};

export type ImportColumnSpec = {
  header: string;
  key: string;
  required: boolean;
  description?: string;
};

export type DryRunResult = {
  entity: ImportEntity;
  columns: ImportColumnSpec[];
  rows: ValidatedRow[];
  summary: DryRunSummary;
  fatalErrors: string[];
};

export type CommitOptions = {
  allowWarnings: boolean;
};

export type CommittedRow = {
  rowNumber: number;
  ok: boolean;
  entityId?: string;
  userId?: string;
  inviteUrl?: string;
  error?: string;
};

export type CommitSummary = {
  attempted: number;
  created: number;
  skipped: number;
  failed: number;
};

export type CommitResult = {
  entity: ImportEntity;
  rows: CommittedRow[];
  summary: CommitSummary;
};

// ─── Pure helpers (safe on client) ───────────────────────────────────────────

export function getImportRowStatusLabel(s: ImportRowStatus): string {
  switch (s) {
    case "READY": return "Hazır";
    case "WARNING": return "Uyarı";
    case "ERROR": return "Hata";
    case "SKIPPED_DUPLICATE": return "Atlandı (mükerrer)";
  }
}

export function getImportRowStatusTone(s: ImportRowStatus): "ok" | "warn" | "bad" | "neutral" {
  switch (s) {
    case "READY": return "ok";
    case "WARNING": return "warn";
    case "ERROR": return "bad";
    case "SKIPPED_DUPLICATE": return "neutral";
  }
}

export function normalizeHeader(raw: string): string {
  return raw
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "");
}
