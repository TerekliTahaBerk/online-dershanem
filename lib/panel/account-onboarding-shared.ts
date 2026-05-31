/**
 * Phase 3 / Session 3 — Pure account-onboarding presentation helpers.
 *
 * Extracted from `lib/panel/account-onboarding.ts` so client components can
 * use the state labels/tones and the (pure, DB-free) `deriveUserAccountState`
 * helper without pulling in the `server-only` module that owns the Prisma
 * + bcrypt + audit-log primitives.
 *
 * No imports from `prisma`, `bcryptjs`, `node:crypto`, `audit`, or
 * `notifications`. Safe to import from anywhere.
 */

// ─── Account state machine (derived, pure) ─────────────────────────────

export type UserAccountState =
  | "NO_ACCOUNT"
  | "INVITE_PENDING"
  | "INVITE_EXPIRED"
  | "NEEDS_PASSWORD"
  | "MUST_CHANGE_PASSWORD"
  | "ACTIVE"
  | "DISABLED";

const STATE_LABELS: Record<UserAccountState, string> = {
  NO_ACCOUNT:           "Hesap yok",
  INVITE_PENDING:       "Davet bekleniyor",
  INVITE_EXPIRED:       "Davetin süresi doldu",
  NEEDS_PASSWORD:       "Şifre belirlemedi",
  MUST_CHANGE_PASSWORD: "Şifre değiştirmesi gerekli",
  ACTIVE:               "Aktif",
  DISABLED:             "Devre dışı",
};

const STATE_TONES: Record<UserAccountState, "good" | "warn" | "bad" | "neutral"> = {
  NO_ACCOUNT:           "neutral",
  INVITE_PENDING:       "warn",
  INVITE_EXPIRED:       "bad",
  NEEDS_PASSWORD:       "warn",
  MUST_CHANGE_PASSWORD: "warn",
  ACTIVE:               "good",
  DISABLED:             "bad",
};

export function getUserAccountStateLabel(s: UserAccountState): string {
  return STATE_LABELS[s];
}

export function getUserAccountStateTone(
  s: UserAccountState,
): "good" | "warn" | "bad" | "neutral" {
  return STATE_TONES[s];
}

/**
 * Derives account state from the columns on `User`. Tolerant of databases
 * predating migration 0036 — every Phase 3 column is optional.
 *
 * Priority:
 *   1. `null` user            → NO_ACCOUNT
 *   2. accountDisabledAt set  → DISABLED
 *   3. lastLoginAt && !mustChangePassword → ACTIVE
 *   4. mustChangePassword     → MUST_CHANGE_PASSWORD
 *   5. valid invite token     → INVITE_PENDING
 *   6. expired invite token   → INVITE_EXPIRED
 *   7. has passwordHash       → NEEDS_PASSWORD (set but never logged in — rare)
 *   8. otherwise              → NEEDS_PASSWORD
 */
export function deriveUserAccountState(u: {
  passwordHash?: string | null;
  lastLoginAt?: Date | null;
  mustChangePassword?: boolean | null;
  accountDisabledAt?: Date | null;
  userInviteToken?: string | null;
  userInviteTokenExpiresAt?: Date | null;
} | null | undefined): UserAccountState {
  if (!u) return "NO_ACCOUNT";
  if (u.accountDisabledAt) return "DISABLED";
  if (u.lastLoginAt && !u.mustChangePassword) return "ACTIVE";
  if (u.mustChangePassword) return "MUST_CHANGE_PASSWORD";
  if (u.userInviteToken) {
    const exp = u.userInviteTokenExpiresAt;
    if (!exp || exp.getTime() > Date.now()) return "INVITE_PENDING";
    return "INVITE_EXPIRED";
  }
  return "NEEDS_PASSWORD";
}

// ─── Duplicate match shape (pure type) ─────────────────────────────────

export type DuplicateMatch = {
  field: "phoneKey" | "email" | "user.email";
  existingId: string;
  existingLabel: string;
  entity: "Student" | "Parent" | "User";
};
