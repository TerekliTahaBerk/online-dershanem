import { createHash } from "node:crypto";
import { isIP } from "node:net";

import { checkRateLimit } from "@/lib/rate-limit";

export { checkRateLimit };

export class RateLimitError extends Error {
  readonly code = "RATE_LIMIT" as const;
  readonly retryAfterMs: number;
  readonly resetAt: Date;

  constructor(message: string, retryAfterMs: number, resetAt: Date) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
    this.resetAt = resetAt;
  }
}

export type RateLimitOpts = {
  /** Max calls allowed inside the exact sliding `windowMs`. */
  max: number;
  windowMs: number;
  message?: string;
};

export async function assertRateLimit(
  key: string,
  opts: RateLimitOpts,
): Promise<void> {
  const decision = await checkRateLimit(key, opts.max, opts.windowMs);
  if (!decision.allowed) {
    throw new RateLimitError(
      opts.message ??
        "Çok fazla istek gönderildi. Lütfen biraz bekleyip tekrar deneyin.",
      decision.retryAfterMs,
      decision.resetAt,
    );
  }
}

function normalizePart(value: string, label: string): string {
  const normalized = value.normalize("NFKC").trim().toLowerCase();
  if (!normalized) return "unknown";
  // Encoding makes separators unambiguous and keeps differently composed input
  // on one canonical key without changing persisted identifiers elsewhere.
  const encoded = encodeURIComponent(normalized);
  if (!encoded) return label;
  if (encoded.length <= 160) return encoded;
  return `sha256-${createHash("sha256").update(normalized).digest("base64url")}`;
}

function normalizeIp(raw: string | null): string | null {
  if (!raw) return null;
  let candidate = raw.trim();
  if (candidate.includes(",")) candidate = candidate.split(",", 1)[0].trim();
  if (candidate.startsWith("[") && candidate.includes("]")) {
    candidate = candidate.slice(1, candidate.indexOf("]"));
  } else if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.slice(0, candidate.lastIndexOf(":"));
  }
  if (candidate.toLowerCase().startsWith("::ffff:")) {
    const ipv4 = candidate.slice(7);
    if (isIP(ipv4) === 4) return ipv4;
  }
  const version = isIP(candidate);
  if (version === 4) return candidate;
  if (version === 6) {
    return new URL(`http://[${candidate}]/`).hostname.slice(1, -1).toLowerCase();
  }
  return null;
}

export type ProxyMode = "vercel" | "cloudflare" | "local" | "untrusted";

export function configuredProxyMode(
  env: Readonly<Record<string, string | undefined>> = process.env,
): ProxyMode {
  if (env.RATE_LIMIT_PROXY_MODE === "vercel") return "vercel";
  if (env.RATE_LIMIT_PROXY_MODE === "cloudflare") return "cloudflare";
  if (env.VERCEL === "1") return "vercel";
  if (env.RATE_LIMIT_PROXY_MODE === "local" && env.CI === "true") return "local";
  if (env.NODE_ENV === "production") return "untrusted";
  return "local";
}

/**
 * Resolve a client address only from the trusted edge for the active topology.
 *
 * - Vercel: `x-vercel-forwarded-for` is platform generated and cannot be
 *   replaced by a proxy-supplied `x-forwarded-for` value.
 * - Cloudflare: opt in with RATE_LIMIT_PROXY_MODE=cloudflare only when direct
 *   access to the Vercel deployment is blocked; then CF-Connecting-IP is the
 *   single-value visitor address supplied by Cloudflare.
 * - Local/test: validated forwarding headers are accepted. CI must opt in with
 *   RATE_LIMIT_PROXY_MODE=local. Production without a known topology fails
 *   closed instead of trusting caller-controlled forwarding headers.
 *
 * Invalid or absent input deliberately collapses to `unknown` instead of
 * trusting a lower-priority, potentially attacker-controlled header.
 */
export function getClientIp(
  headers: { get(name: string): string | null } | null | undefined,
  mode: ProxyMode = configuredProxyMode(),
): string {
  if (mode === "vercel") {
    return normalizeIp(headers?.get("x-vercel-forwarded-for") ?? null) ?? "unknown";
  }
  if (mode === "cloudflare") {
    return normalizeIp(headers?.get("cf-connecting-ip") ?? null) ?? "unknown";
  }
  if (mode === "untrusted") return "unknown";
  return (
    normalizeIp(headers?.get("x-vercel-forwarded-for") ?? null) ??
    normalizeIp(headers?.get("cf-connecting-ip") ?? null) ??
    normalizeIp(headers?.get("x-forwarded-for") ?? null) ??
    normalizeIp(headers?.get("x-real-ip") ?? null) ??
    "unknown"
  );
}

export function getRateLimitKeyFromUser(
  userId: string,
  action: string,
): string {
  return `act:${normalizePart(action, "action")}:user:${normalizePart(userId, "user")}`;
}

export function getRateLimitKeyFromIp(
  headers: { get(name: string): string | null } | null | undefined,
  action: string,
  mode?: ProxyMode,
): string {
  return `act:${normalizePart(action, "action")}:ip:${getClientIp(headers, mode)}`;
}

export function getRateLimitKeyComposite(
  userId: string,
  action: string,
  resourceId: string,
): string {
  return `act:${normalizePart(action, "action")}:user:${normalizePart(userId, "user")}:res:${normalizePart(resourceId, "resource")}`;
}

export function retryAfterSeconds(retryAfterMs: number): number {
  return Math.max(1, Math.ceil(retryAfterMs / 1000));
}

export function rateLimitResponseHeaders(retryAfterMs: number): Record<string, string> {
  return {
    "Retry-After": String(retryAfterSeconds(retryAfterMs)),
    "Cache-Control": "no-store",
  };
}
