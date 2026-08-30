import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ expectedVersion: z.number().int().min(1) });
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().parentWeeklyDigest) return NextResponse.json({ error: "Haftalık özet henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.weekly_digest.publish", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:digest-publish:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Özet sürümü geçersiz." }, { status: 400 }); const { id } = await context.params;
  const digest = await prisma.weeklyDigest.findFirst({ where: { id, status: "DRAFT", student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: auth.session.userId } } } } }, include: { student: { include: { user: { select: { id: true } }, parents: { select: { parentId: true } } } } } }); if (!digest) return NextResponse.json({ error: "Özet bulunamadı." }, { status: 404 });
  const recipientIds = [...new Set([digest.student.user.id, ...digest.student.parents.map((link) => link.parentId)])];
  const rawRows = recipientIds.map((userId) => ({ userId, type: "LESSON_SUMMARY" as const, title: "Haftalık özet hazır", body: "İki iyi giden nokta ve bir küçük destek önerisi hazır.", href: userId === digest.student.user.id ? "/panel/ogrenci/haftalik" : `/panel/veli/haftalik?studentId=${digest.studentId}` }));
  const rows = await filterNotificationRows(rawRows, "weeklyDigest");
  const published = await prisma.$transaction(async (tx) => { const updated = await tx.weeklyDigest.updateMany({ where: { id, status: "DRAFT", version: parsed.data.expectedVersion }, data: { status: "PUBLISHED", publishedById: auth.session.userId, publishedAt: new Date(), version: { increment: 1 } } }); if (updated.count !== 1) throw new Error("DIGEST_VERSION_CONFLICT"); if (rows.length) await tx.notification.createMany({ data: rows }); return true; }).catch((error) => error instanceof Error && error.message === "DIGEST_VERSION_CONFLICT" ? false : Promise.reject(error));
  if (!published) return NextResponse.json({ error: "Özet başka bir sekmede değişti." }, { status: 409 });
  await queuePanelNotificationEmails(rawRows, "weeklyDigest"); const band = recipientIds.length === 1 ? "1" : recipientIds.length <= 3 ? "2-3" : "4+";
  await recordPanelProductEvent({ name: "weekly_digest_published", properties: { trendBand: digest.trendBand as "IMPROVING" | "STEADY" | "BUILDING" | "LIMITED_DATA", recipientBand: band } }, auth.session.role);
  return NextResponse.json({ published: true });
}
