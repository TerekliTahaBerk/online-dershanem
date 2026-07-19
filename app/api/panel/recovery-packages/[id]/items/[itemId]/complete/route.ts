import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const MAX_AGE = 365 * 24 * 60 * 60 * 1000;
export async function POST(request: Request, context: { params: Promise<{ id: string; itemId: string }> }) {
  const auth = await requireApiRole("STUDENT"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().recoveryPackage) return NextResponse.json({ error: "Telafi paketi henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.recovery.item.complete", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:recovery-item:${auth.session.userId}`, rateLimit: { max: 100, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const { id, itemId } = await context.params;
  const target = await prisma.recoveryPackageItem.findFirst({ where: { id: itemId, packageId: id, package: { status: "PUBLISHED", student: { userId: auth.session.userId } } }, select: { id: true, kind: true, completedAt: true } }); if (!target) return NextResponse.json({ error: "Telafi adımı bulunamadı." }, { status: 404 });
  const result = await prisma.$transaction(async (tx) => { if (!target.completedAt) await tx.recoveryPackageItem.update({ where: { id: itemId }, data: { completedAt: new Date() } }); const remaining = await tx.recoveryPackageItem.count({ where: { packageId: id, completedAt: null } }); const packageRow = await tx.recoveryPackage.findUniqueOrThrow({ where: { id }, include: { lesson: { select: { endsAt: true } }, _count: { select: { items: true } } } }); const shouldComplete = remaining === 0 && packageRow.checkpointResponse !== null; if (shouldComplete) await tx.recoveryPackage.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date(), version: { increment: 1 } } }); return { packageRow, completed: shouldComplete, replayed: Boolean(target.completedAt) }; });
  if (!result.replayed) await recordPanelProductEvent({ name: "recovery_item_completed", properties: { kind: target.kind } }, auth.session.role);
  if (result.completed) await recordPanelProductEvent({ name: "recovery_package_completed", properties: { completionDurationMs: Math.min(MAX_AGE, Math.max(0, Date.now() - result.packageRow.lesson.endsAt.getTime())), within72h: Date.now() <= result.packageRow.dueAt.getTime(), itemCount: result.packageRow._count.items } }, auth.session.role);
  return NextResponse.json({ completed: result.completed, replayed: result.replayed });
}
