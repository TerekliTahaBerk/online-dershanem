import type { UserRole } from "@prisma/client";

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export type SessionPolicy = {
  absoluteTtlMs: number;
  idleTimeoutMs: number;
};

/** Parola girildikten sonra her rolde oturumun açık kaldığı süre. */
const REMEMBER_FOR_MS = 24 * HOUR_MS;

/**
 * Server-side session limits. Every role is remembered for exactly 24 hours
 * after the password is entered (web and mobile); the idle limit equals the
 * absolute one, so an unused session is not closed earlier. MFA and step-up
 * may raise assurance but never extend these limits.
 */
export const SESSION_POLICIES: Readonly<Record<UserRole, SessionPolicy>> = {
  STUDENT: { absoluteTtlMs: REMEMBER_FOR_MS, idleTimeoutMs: REMEMBER_FOR_MS },
  PARENT: { absoluteTtlMs: REMEMBER_FOR_MS, idleTimeoutMs: REMEMBER_FOR_MS },
  TEACHER: { absoluteTtlMs: REMEMBER_FOR_MS, idleTimeoutMs: REMEMBER_FOR_MS },
  ADMIN: { absoluteTtlMs: REMEMBER_FOR_MS, idleTimeoutMs: REMEMBER_FOR_MS },
};

export type SessionExpiryReason = "ABSOLUTE" | "IDLE";

export function absoluteSessionExpiry(role: UserRole, createdAt: Date, storedExpiresAt?: Date): Date {
  const policyExpiry = createdAt.getTime() + SESSION_POLICIES[role].absoluteTtlMs;
  return new Date(Math.min(policyExpiry, storedExpiresAt?.getTime() ?? Number.POSITIVE_INFINITY));
}

export function sessionExpiryReason(
  session: { role: UserRole; createdAt: Date; expiresAt: Date; lastSeenAt: Date },
  now: Date,
): SessionExpiryReason | null {
  if (absoluteSessionExpiry(session.role, session.createdAt, session.expiresAt).getTime() <= now.getTime()) return "ABSOLUTE";
  if (session.lastSeenAt.getTime() + SESSION_POLICIES[session.role].idleTimeoutMs <= now.getTime()) return "IDLE";
  return null;
}

export function formatPolicyDuration(durationMs: number): string {
  if (durationMs % DAY_MS === 0 && durationMs > DAY_MS) return `${durationMs / DAY_MS} gün`;
  if (durationMs % HOUR_MS === 0) return `${durationMs / HOUR_MS} saat`;
  return `${durationMs / MINUTE_MS} dakika`;
}
