import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminApi, apiOk, apiErr } from "@/lib/odk/api";
import { guardMutation } from "@/lib/security/mutation-guard";

export const dynamic = "force-dynamic";

/**
 * Phase 2 / Session 15 — Archive endpoint.
 *
 * POST   = ARCHIVE   (DRAFT | PUBLISHED → ARCHIVED). Existing attempts kept.
 * DELETE = UNARCHIVE (ARCHIVED → DRAFT). Admin must re-run the publish gate
 *          to reach PUBLISHED again.
 *
 * We never mutate `publishedAt` here — the historical first-publish time is
 * preserved across archive/unarchive cycles. Re-publishing later overwrites
 * it via the publish route.
 *
 * No attempt rows are deleted under any circumstance — see Session 13 audit
 * §16 for the read-only attempts invariant.
 */

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  // Phase 2 / Session 17 — abuse hardening: per-admin rate-limit + same-origin.
  const guard = await guardMutation({
    action: "odk.exam.archive",
    userId: auth.userId,
    requireSameOrigin: true,
    headers: _req.headers,
    rateLimit: { max: 60, windowMs: 60 * 60_000 },
  });
  if (!guard.ok) {
    return apiErr(guard.message, guard.code === "RATE_LIMIT" ? 429 : 403);
  }

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam.status === "ARCHIVED") return apiErr("Zaten arşivde.", 409);

  const updated = await prisma.odkExam.update({
    where: { id },
    data: { status: "ARCHIVED" },
    select: { id: true, status: true, publishedAt: true },
  });
  return apiOk({ exam: updated });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  // Phase 2 / Session 17 — same as POST.
  const guard = await guardMutation({
    action: "odk.exam.unarchive",
    userId: auth.userId,
    requireSameOrigin: true,
    headers: _req.headers,
    rateLimit: { max: 60, windowMs: 60 * 60_000 },
  });
  if (!guard.ok) {
    return apiErr(guard.message, guard.code === "RATE_LIMIT" ? 429 : 403);
  }

  const exam = await prisma.odkExam.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!exam) return apiErr("Deneme bulunamadı.", 404);
  if (exam.status !== "ARCHIVED") {
    return apiErr("Sadece ARCHIVED denemeler arşivden çıkarılabilir.", 409);
  }

  const updated = await prisma.odkExam.update({
    where: { id },
    data: { status: "DRAFT" },
    select: { id: true, status: true },
  });
  return apiOk({ exam: updated });
}
