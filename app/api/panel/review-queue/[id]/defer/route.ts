import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { sameLocalDay } from "@/lib/review-scheduler";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("STUDENT"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().reviewQueue) return NextResponse.json({ error: "Tekrar kuyruğu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.review_item.defer", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:review-defer:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 }); const { id } = await params; const now = new Date();
  const item = await prisma.reviewItem.findFirst({ where: { id, student: { userId: auth.session.userId }, status: "ACTIVE", dueAt: { lte: now } }, select: { id: true, lastDeferredOn: true } });
  if (!item) return NextResponse.json({ error: "Bugün ertelenebilecek tekrar bulunamadı." }, { status: 404 });
  if (item.lastDeferredOn && sameLocalDay(item.lastDeferredOn, now)) return new NextResponse(null, { status: 204 });
  await prisma.reviewItem.update({ where: { id }, data: { dueAt: new Date(now.getTime() + 86400000), lastDeferredOn: now } });
  await recordPanelProductEvent({ name: "review_item_deferred", properties: { deferDays: 1 } }, auth.session.role);
  return new NextResponse(null, { status: 204 });
}
