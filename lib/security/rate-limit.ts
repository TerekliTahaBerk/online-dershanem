/**
 * Phase 2 / Session 17 — Rate-limit facade.
 *
 * Thin wrapper around `lib/rate-limit.ts` (DB-backed `RateLimitEntry`).
 * Adds:
 *  - `RateLimitError` — typed throwable surfaced as a Turkish user message.
 *  - `assertRateLimit` — throws on breach; convenient for server actions.
 *  - Key builders for user / IP / composite scopes.
 *
 * Existing infra is intentionally reused (no new tables, no new cron job).
 * Sliding window pruning runs via `app/api/cron/rate-limit-prune/route.ts`.
 */

import { checkRateLimit } from "@/lib/rate-limit";

export { checkRateLimit };

export class RateLimitError extends Error {
  readonly code = "RATE_LIMIT" as const;
  readonly retryAfterMs: number;
  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export type RateLimitOpts = {
  /** Max calls allowed inside `windowMs`. */
  max: number;
  /** Sliding window in milliseconds. */
  windowMs: number;
  /** Optional Turkish error message override. */
  message?: string;
};

/**
 * Reserve a token for `key`. Throws `RateLimitError` if the caller has
 * exceeded `opts.max` in the last `opts.windowMs`.
 */
export async function assertRateLimit(
  key: string,
  opts: RateLimitOpts,
): Promise<void> {
  const { allowed } = await checkRateLimit(key, opts.max, opts.windowMs);
  if (!allowed) {
    throw new RateLimitError(
      opts.message ??
        "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.",
      opts.windowMs,
    );
  }
}

/** Build a per-user, per-action key. */
export function getRateLimitKeyFromUser(
  userId: string,
  action: string,
): string {
  return `act:${action}:user:${userId}`;
}

/** Build a per-IP, per-action key. */
export function getRateLimitKeyFromIp(
  headers: { get(name: string): string | null } | null | undefined,
  action: string,
): string {
  const xff = headers?.get("x-forwarded-for") ?? "";
  const real = headers?.get("x-real-ip") ?? "";
  const ip = (xff.split(",")[0] || real || "unknown").trim();
  return `act:${action}:ip:${ip}`;
}

/** Build a per-user-+-resource key (e.g. one attempt id). */
export function getRateLimitKeyComposite(
  userId: string,
  action: string,
  resourceId: string,
): string {
  return `act:${action}:user:${userId}:res:${resourceId}`;
}
