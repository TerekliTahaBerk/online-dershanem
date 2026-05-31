/**
 * Phase 2 / Session 13 — Parent invite token primitives.
 *
 * Server-only because it imports `node:crypto`. Display-only constants and
 * relationship helpers stay in `lib/parents.ts` so client components can
 * still import them.
 */
import "server-only";
import { randomBytes } from "node:crypto";

/** Default invite TTL: 14 days. */
export const DEFAULT_PARENT_INVITE_TTL_DAYS = 14;

/**
 * Generates a URL-safe random token. 24 bytes → 32 chars base64url.
 */
export function generateParentInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

/**
 * Returns the public URL where a parent can set their password.
 *
 * If `NEXT_PUBLIC_APP_URL` is unset, the link is relative.
 */
export function buildParentInviteUrl(token: string, base?: string): string {
  const origin = (base ?? process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${origin}/veli-davet/${token}`;
}

/** Expiry helper. */
export function defaultParentInviteExpiresAt(
  ttlDays = DEFAULT_PARENT_INVITE_TTL_DAYS,
): Date {
  const d = new Date();
  d.setDate(d.getDate() + ttlDays);
  return d;
}
