import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { scheduleReview } from "@/lib/review-scheduler";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ response: z.enum(["WRONG", "UNSURE", "CORRECT"]), idempotencyKey: z.string().min(8).max(100).regex(/^[a-zA-Z0-9_-]+$/), solutionNote: z.string().trim().max(500).optional() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("STUDENT"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().reviewQueue) return NextResponse.json({ error: "Tekrar kuyruğu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.review_item.respond", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:review-response:${auth.session.userId}`, rateLimit: { max: 100, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Yanıtı kontrol edin." }, { status: 400 }); const { id } = await params;
  const existing = await prisma.reviewAttempt.findUnique({ where: { reviewItemId_idempotencyKey: { reviewItemId: id, idempotencyKey: parsed.data.idempotencyKey } }, select: { nextDueAt: true, stageAfter: true, reviewItem: { select: { status: true } } } });
  if (existing) return NextResponse.json({ nextDueAt: existing.nextDueAt?.toISOString() || null, stage: existing.stageAfter, status: existing.reviewItem.status, replayed: true });
  const now = new Date();
  const item = await prisma.reviewItem.findFirst({ where: { id, student: { userId: auth.session.userId }, status: "ACTIVE" }, select: { id: true, stage: true, dueAt: true, createdAt: true } });
  if (!item) return NextResponse.json({ error: "Tekrar öğesi bulunamadı." }, { status: 404 });
  if (item.dueAt > now) return NextResponse.json({ error: "Bu tekrar henüz bugünün listesinde değil." }, { status: 409 });
  const schedule = scheduleReview(item.stage, parsed.data.response, now);
  await prisma.$transaction(async (tx) => {
    await tx.reviewAttempt.create({ data: { reviewItemId: item.id, response: parsed.data.response, stageBefore: item.stage, stageAfter: schedule.stage, nextDueAt: schedule.dueAt, idempotencyKey: parsed.data.idempotencyKey, reviewedAt: now } });
    await tx.reviewItem.update({ where: { id: item.id }, data: { stage: schedule.stage, dueAt: schedule.dueAt || item.dueAt, status: schedule.mastered ? "MASTERED" : "ACTIVE", lastReviewedAt: now, solutionNote: parsed.data.solutionNote || undefined } });
  });
  const ageDays = Math.max(0, Math.floor((now.getTime() - item.createdAt.getTime()) / 86400000));
  await recordPanelProductEvent({ name: "review_item_answered", properties: { response: parsed.data.response, stageBefore: item.stage, stageAfter: schedule.stage, nextIntervalDays: schedule.intervalDays || 0, ageBand: ageDays <= 7 ? "0-7" : ageDays <= 30 ? "8-30" : "31+", mastered: schedule.mastered } }, auth.session.role);
  return NextResponse.json({ nextDueAt: schedule.dueAt?.toISOString() || null, stage: schedule.stage, status: schedule.mastered ? "MASTERED" : "ACTIVE", replayed: false });
}
