/**
 * Parent helpers — Phase 1.5 hardening.
 *
 * Centralizes:
 *   - Relationship label/tone (works with the Phase-1.5 enum or the legacy
 *     free-text `relationship` column; either is acceptable)
 *   - Onboarding status (Aktif / Davet gönderildi / Şifre belirlemedi /
 *     Hiç giriş yapmadı / Telefon eksik) derived from existing fields plus
 *     the new optional inviteToken trio.
 *   - `regenerateParentInviteAction` + `consumeParentInviteToken` server
 *     primitives. **No external sending in Phase 1.5** — the action only
 *     produces a copyable token; an admin pastes the link to WhatsApp/SMS
 *     manually until Phase 2 ships providers.
 */

// Phase 2 / Session 13 — Invite token primitives (using `node:crypto`)
// were moved to `lib/parent-invites.ts` so this module can be safely
// imported from `"use client"` components. Re-exported below for
// backwards compatibility with server callers.

/**
 * Phase-1.5 relationship enum at the application boundary. The DB column
 * (`ParentStudent.relationshipType`) is an actual Prisma enum after migration
 * 0028, but we keep an app-level union here so consumers can stay decoupled
 * from the generated client during the migration window.
 */
export const PARENT_RELATIONSHIP_TYPES = [
  "MOTHER",
  "FATHER",
  "GUARDIAN",
  "SIBLING",
  "OTHER",
] as const;

export type ParentRelationshipType = (typeof PARENT_RELATIONSHIP_TYPES)[number];

const RELATIONSHIP_LABELS: Record<ParentRelationshipType, string> = {
  MOTHER:   "Anne",
  FATHER:   "Baba",
  GUARDIAN: "Vasi",
  SIBLING:  "Abla / Abi",
  OTHER:    "Diğer",
};

/**
 * Best-effort label for a relationship value. Accepts:
 *   - a Phase 1.5 enum value     ("MOTHER")
 *   - a legacy free-text Turkish ("Anne", "Baba", "Vasi", "Abla/Abi", custom)
 *   - null / undefined           → "—"
 *
 * If both the enum field and the free-text field are present, prefer the
 * enum's canonical label, but fall back to free text when the enum is
 * "OTHER" (so the custom label like "Dede" is shown).
 */
export function getParentRelationshipLabel(
  type?: ParentRelationshipType | string | null,
  customText?: string | null,
): string {
  if (type && type in RELATIONSHIP_LABELS) {
    const t = type as ParentRelationshipType;
    if (t === "OTHER" && customText && customText.trim()) return customText.trim();
    return RELATIONSHIP_LABELS[t];
  }
  // Legacy free-text path.
  const free = (customText ?? type ?? "").toString().trim();
  return free || "—";
}

/** Turkish label by enum value (no fallback to custom). */
export function getCanonicalRelationshipLabel(type: ParentRelationshipType): string {
  return RELATIONSHIP_LABELS[type];
}

/** Type guard. */
export function isParentRelationshipType(s: unknown): s is ParentRelationshipType {
  return typeof s === "string" && (PARENT_RELATIONSHIP_TYPES as readonly string[]).includes(s);
}

/**
 * Tries to map a free-text Turkish relation to the enum. Returns OTHER (with
 * the original text used as customText) when no canonical match is found.
 *
 * Used during the migration window to backfill the new `relationshipType`
 * column from the existing `relationship` strings non-destructively.
 */
export function inferRelationshipType(free: string | null | undefined): {
  type: ParentRelationshipType;
  customText: string | null;
} {
  const t = (free ?? "").toString().trim().toLowerCase();
  if (!t) return { type: "OTHER", customText: null };
  if (/^anne(si)?$/.test(t)) return { type: "MOTHER", customText: null };
  if (/^baba(s[ıi])?$/.test(t)) return { type: "FATHER", customText: null };
  if (/^vasi(si)?$/.test(t) || /vel[iî]/.test(t)) return { type: "GUARDIAN", customText: null };
  if (/abla|abi|kard|sibling/.test(t)) return { type: "SIBLING", customText: null };
  return { type: "OTHER", customText: (free ?? "").trim() || null };
}

// ── Parent onboarding status ────────────────────────────────────────────

export type ParentOnboardingState =
  | "ACTIVE"
  | "INVITE_PENDING"
  | "INVITE_NOT_SENT"
  | "PASSWORD_NOT_SET"
  | "PHONE_MISSING";

const ONBOARDING_LABELS: Record<ParentOnboardingState, string> = {
  ACTIVE:           "Aktif",
  INVITE_PENDING:   "Davet gönderildi",
  INVITE_NOT_SENT:  "Davet gönderilmedi",
  PASSWORD_NOT_SET: "Şifre belirlemedi",
  PHONE_MISSING:    "Telefon eksik",
};

const ONBOARDING_TONES: Record<ParentOnboardingState, "good" | "warn" | "bad" | "neutral"> = {
  ACTIVE:           "good",
  INVITE_PENDING:   "warn",
  INVITE_NOT_SENT:  "neutral",
  PASSWORD_NOT_SET: "warn",
  PHONE_MISSING:    "bad",
};

export function getParentOnboardingLabel(s: ParentOnboardingState): string {
  return ONBOARDING_LABELS[s];
}

export function getParentOnboardingTone(s: ParentOnboardingState): "good" | "warn" | "bad" | "neutral" {
  return ONBOARDING_TONES[s];
}

/**
 * Derives onboarding state from a parent record's known fields. Tolerant of
 * databases that haven't yet received migration 0028 — every invite field is
 * optional.
 *
 * Priority (top wins):
 *   1. Hiç giriş yapmadı: userId set ama lastLoginAt yok ve invite gönderilmemiş
 *   2. PHONE_MISSING: phone is null AND no userId yet (can't invite without contact)
 *   3. ACTIVE:        user account exists and lastLoginAt is set
 *   4. PASSWORD_NOT_SET: user account exists but no passwordHash / lastLoginAt
 *   5. INVITE_PENDING: inviteToken exists and not expired
 *   6. INVITE_NOT_SENT: no userId, has phone, no invite token
 */
export function deriveParentOnboardingState(p: {
  userId?: string | null;
  phone?: string | null;
  lastLoginAt?: Date | null;
  hasPassword?: boolean | null;
  parentInviteToken?: string | null;
  parentInviteTokenExpiresAt?: Date | null;
  parentInviteSentAt?: Date | null;
}): ParentOnboardingState {
  const now = Date.now();
  const inviteValid =
    !!p.parentInviteToken &&
    (!p.parentInviteTokenExpiresAt || p.parentInviteTokenExpiresAt.getTime() > now);

  if (p.userId && p.lastLoginAt) return "ACTIVE";
  if (p.userId && p.hasPassword === false) return "PASSWORD_NOT_SET";
  if (p.userId && !p.lastLoginAt) return "PASSWORD_NOT_SET";
  if (inviteValid && p.parentInviteSentAt) return "INVITE_PENDING";
  if (!p.phone) return "PHONE_MISSING";
  return "INVITE_NOT_SENT";
}

// ── Invite token primitives ──────────────────────────────────────────────
// Moved to `lib/parent-invites.ts` (server-only). Server callers must import
// directly from `@/lib/parent-invites` — we deliberately do NOT re-export
// here so that this module stays client-bundle safe.
