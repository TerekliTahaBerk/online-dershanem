import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { filterNotificationRows, queuePanelNotificationEmails } from "@/lib/panel-notifications";
import { rebalanceApprovedPlanForRecovery } from "@/lib/recovery-package-server";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ expectedVersion: z.number().int().min(1) }).strict();
const MAX_AGE = 365 * 24 * 60 * 60 * 1000;
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("TEACHER"); if (!auth.ok) return auth.response;
  const flags = getPanelFeatureFlags(); if (!flags.recoveryPackage) return NextResponse.json({ error: "Telafi paketi henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.recovery.publish", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:recovery-publish:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Paket sürümü geçersiz." }, { status: 400 }); const { id } = await context.params;
  const item = await prisma.recoveryPackage.findFirst({ where: { id, status: "DRAFT", lesson: { teacherId: auth.session.userId, status: "COMPLETED", group: { isActive: true } } }, include: { lesson: { select: { groupId: true, endsAt: true } }, student: { include: { user: { select: { id: true } } } }, items: true } });
  if (!item) return NextResponse.json({ error: "Telafi paketi bulunamadı." }, { status: 404 });
  const enrollment = await prisma.enrollment.findFirst({ where: { groupId: item.lesson.groupId, studentId: item.studentId, endedAt: null }, select: { id: true } }); if (!enrollment) return NextResponse.json({ error: "Telafi paketi bulunamadı." }, { status: 404 });
  const rawRows = [{ userId: item.student.user.id, type: "ABSENCE" as const, title: "Kaçırdığın ders için küçük telafi hazır", body: "Özet, kaynak ve mini kontrol tek sırada hazır.", href: "/panel/ogrenci/telafi" }];
  const rows = await filterNotificationRows(rawRows, "absence");
  const changed = await prisma.$transaction(async (tx) => { const updated = await tx.recoveryPackage.updateMany({ where: { id, status: "DRAFT", version: parsed.data.expectedVersion }, data: { status: "PUBLISHED", publishedById: auth.session.userId, publishedAt: new Date(), version: { increment: 1 } } }); if (updated.count !== 1) return false; if (rows.length) await tx.notification.createMany({ data: rows }); return true; });
  if (!changed) return NextResponse.json({ error: "Paket başka bir sekmede değişti." }, { status: 409 });
  await queuePanelNotificationEmails(rawRows, "absence");
  const planRebalanced = flags.adaptivePlan ? await rebalanceApprovedPlanForRecovery(item.studentId, auth.session.userId).catch(() => false) : false;
  await recordPanelProductEvent({ name: "recovery_package_published", properties: { publishDelayMs: Math.min(MAX_AGE, Math.max(0, Date.now() - item.lesson.endsAt.getTime())), itemCount: item.items.length, planRebalanced } }, auth.session.role);
  return NextResponse.json({ published: true, planRebalanced });
}
