/**
 * Phase 2 / Session 17 — Mutation guard.
 *
 * Composable wrapper combining same-origin + rate-limit checks for high-risk
 * server actions / API routes. Authentication and role enforcement remain the
 * caller's responsibility — note that the site currently has NO auth layer
 * (panel is being rebuilt from scratch), so this guard is origin + rate-limit
 * only. Do not assume a caller is authenticated because it passed this guard.
 *
 * Two ergonomic surfaces:
 *
 *  1. `guardMutation` — non-throwing; returns a discriminated result. Useful
 *     for API routes that want to convert the failure into an HTTP response.
 *  2. `enforceMutation` — throws on failure; convenient inside server actions
 *     that bubble Turkish error strings to the client form state.
 *
 * Both are intentionally tiny — feature parity with hand-rolled checks but
 * with one place to evolve (e.g. swap the rate-limiter, add metrics).
 */

import { headers as nextHeaders } from "next/headers";
import { NextResponse } from "next/server";

import {
  assertSameOrigin,
  type SameOriginCheck,
} from "@/lib/security/origin";
import {
  assertRateLimit,
  RateLimitError,
  getRateLimitKeyFromUser,
  rateLimitResponseHeaders,
  type RateLimitOpts,
} from "@/lib/security/rate-limit";
import { getSession } from "@/lib/auth/session";
import { getResolvedAdminPreview } from "@/lib/auth/admin-preview";
import { logAudit } from "@/lib/audit";

export type MutationGuardOpts = {
  /** Stable action identifier, e.g. `homework.submit`. */
  action: string;
  /** Authenticated user id; required when `rateLimit` is set without a custom key. */
  userId?: string;
  /** Optional explicit rate-limit key (overrides per-user default). */
  rateLimitKey?: string;
  /** Rate-limit window/quota; omit to skip. */
  rateLimit?: RateLimitOpts;
  /** When true, run `assertSameOrigin` against incoming request headers. */
  requireSameOrigin?: boolean;
  /** Pre-fetched headers (e.g. from `NextRequest.headers`); falls back to `next/headers`. */
  headers?: { get(name: string): string | null };
  /**
   * Admin panel önizlemesinde yazmayı serbest bırak (yalnız açık "Yönetici işlemi"
   * akışları için). Varsayılan false — preview read-only.
   */
  allowAdminPreviewWrite?: boolean;
};

export type GuardResult =
  | { ok: true }
  | {
      ok: false;
      code: "ORIGIN" | "RATE_LIMIT" | "ADMIN_PREVIEW_READONLY";
      message: string;
      retryAfterMs?: number;
    };

async function resolveHeaders(
  provided?: MutationGuardOpts["headers"],
): Promise<{ get(name: string): string | null }> {
  if (provided) return provided;
  // `headers()` is async in Next 15.
  const h = await nextHeaders();
  return { get: (name: string) => h.get(name) ?? null };
}

/** Non-throwing guard — returns structured result. */
export async function guardMutation(
  opts: MutationGuardOpts,
): Promise<GuardResult> {
  if (!opts.allowAdminPreviewWrite) {
    const actor = await getSession();
    if (actor?.role === "ADMIN") {
      const preview = await getResolvedAdminPreview(actor);
      if (preview) {
        await logAudit({
          actorUserId: actor.userId,
          entityType: "AdminPreview",
          entityId: preview.context.previewUserId,
          action: "ADMIN_PREVIEW_MUTATION_BLOCKED",
          summary: "Yönetici önizlemesinde mutation engellendi",
          payload: {
            action: opts.action,
            previewRole: preview.context.previewRole,
            subjectUserId: preview.context.previewUserId,
          },
        });
        return {
          ok: false,
          code: "ADMIN_PREVIEW_READONLY",
          message: "Yönetici önizlemesinde işlem yapılamaz.",
        };
      }
    }
  }

  if (opts.requireSameOrigin) {
    const h = await resolveHeaders(opts.headers);
    const check: SameOriginCheck = assertSameOrigin(h);
    if (!check.ok) {
      return {
        ok: false,
        code: "ORIGIN",
        message: "İstek reddedildi (kaynak doğrulanamadı).",
      };
    }
  }

  if (opts.rateLimit) {
    const key =
      opts.rateLimitKey ??
      (opts.userId
        ? getRateLimitKeyFromUser(opts.userId, opts.action)
        : null);
    if (!key) {
      // Misconfiguration — skip silently rather than blocking legit users.
      console.warn(
        `[security/mutation-guard] No rate-limit key for action=${opts.action}`,
      );
    } else {
      try {
        await assertRateLimit(key, opts.rateLimit);
      } catch (err) {
        if (err instanceof RateLimitError) {
          return {
            ok: false,
            code: "RATE_LIMIT",
            message: err.message,
            retryAfterMs: err.retryAfterMs,
          };
        }
        throw err;
      }
    }
  }

  return { ok: true };
}

/** Convert every guarded API failure to the same status/body/header contract. */
export function mutationGuardResponse(
  result: Exclude<GuardResult, { ok: true }>,
): NextResponse {
  if (result.code === "RATE_LIMIT") {
    return NextResponse.json(
      { error: result.message, code: "RATE_LIMIT" },
      {
        status: 429,
        headers: rateLimitResponseHeaders(result.retryAfterMs ?? 1_000),
      },
    );
  }
  if (result.code === "ADMIN_PREVIEW_READONLY") {
    return NextResponse.json(
      { error: result.message, code: "ADMIN_PREVIEW_READONLY" },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { error: result.message, code: "ORIGIN" },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

/** Server action'lar için: preview açıksa Türkçe Error fırlatır. */
export async function assertAdminPreviewReadOnly(): Promise<void> {
  const actor = await getSession();
  if (actor?.role !== "ADMIN") return;
  const preview = await getResolvedAdminPreview(actor);
  if (!preview) return;
  throw new Error("Yönetici önizlemesinde işlem yapılamaz.");
}

/** Throwing guard — bubbles a Turkish `Error` on failure. */
export async function enforceMutation(opts: MutationGuardOpts): Promise<void> {
  const r = await guardMutation(opts);
  if (!r.ok) throw new Error(r.message);
}
