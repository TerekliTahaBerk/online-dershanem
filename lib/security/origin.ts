/**
 * Phase 2 / Session 17 — Same-origin guard.
 *
 * Lightweight Origin/Referer-based check used as a defence-in-depth layer for
 * mutating server actions and API routes. This guard rejects cross-site form posts and stray
 * fetches from foreign origins.
 *
 * Design notes:
 *  - We rely on `Origin` first, falling back to `Referer` (some browsers omit
 *    `Origin` for same-origin GET/HEAD; for POST it is generally present).
 *  - In production, allowed origins are derived from environment variables.
 *  - In dev, localhost variants are always allowed.
 *  - Fail-open ONLY when both `Origin` and `Referer` are absent — server
 *    actions invoked from same-origin browsing contexts always include at
 *    least one. CLI/curl traffic typically omits both.
 */

const isProd = process.env.NODE_ENV === "production";

/**
 * Build the canonical allow-list of origin strings (scheme + host[:port]).
 * Reads from common env conventions used across the project + Vercel.
 */
export function getAllowedOrigins(): string[] {
  const out = new Set<string>();

  const push = (raw: string | undefined | null) => {
    if (!raw) return;
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      out.add(`${u.protocol}//${u.host}`);
    } catch {
      /* ignore malformed env */
    }
  };

  push(process.env.NEXT_PUBLIC_APP_URL);
  push(process.env.APP_URL);
  // Vercel exposes the deployment hostname (no scheme).
  push(process.env.VERCEL_URL);
  push(process.env.NEXT_PUBLIC_VERCEL_URL);

  if (!isProd) {
    out.add("http://localhost:3000");
    out.add("http://127.0.0.1:3000");
  }

  return [...out];
}

export type SameOriginCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Validate an incoming request's `Origin`/`Referer` against the allow-list.
 * Pass any object with a `get(name: string)` method (Headers, NextRequest.headers).
 */
export function assertSameOrigin(
  headers: { get(name: string): string | null },
): SameOriginCheck {
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) {
    // No env configured — be permissive but visible.
    if (isProd) {
      console.warn(
        "[security/origin] No allowed origins configured — same-origin check skipped.",
      );
    }
    return { ok: true };
  }

  const origin = headers.get("origin");
  if (origin) {
    return allowed.includes(origin)
      ? { ok: true }
      : { ok: false, reason: `Origin reddedildi: ${origin}` };
  }

  const referer = headers.get("referer");
  if (referer) {
    try {
      const u = new URL(referer);
      const ref = `${u.protocol}//${u.host}`;
      return allowed.includes(ref)
        ? { ok: true }
        : { ok: false, reason: `Referer reddedildi: ${ref}` };
    } catch {
      return { ok: false, reason: "Referer ayrıştırılamadı." };
    }
  }

  // Both missing — likely a non-browser caller.
  return { ok: true };
}
