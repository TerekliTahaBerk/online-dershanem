import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

const schema = z.object({ title: z.string().trim().min(2).max(140), description: z.string().trim().max(2000).optional(), dueAt: z.string().datetime(), isActive: z.boolean(), outcomeIds: z.array(z.string().min(1)).max(3).optional(), outcomeSkipReason: z.enum(["CATALOG_MISSING", "COMPLETE_LATER", "NOT_APPLICABLE"]).nullable().optional() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.assignments.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:assignments:update:${auth.session.userId}`, rateLimit: { max: 100, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ödev bilgilerini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const assignment = await prisma.assignment.findFirst({ where: { id, ...(auth.session.role === "TEACHER" ? { group: { teacherId: auth.session.userId } } : {}) }, select: { id: true } });
  if (!assignment) return NextResponse.json({ error: "Ödev bulunamadı." }, { status: 404 });
  const outcomeIds = parsed.data.outcomeIds === undefined ? undefined : [...new Set(parsed.data.outcomeIds)];
  if (getPanelFeatureFlags().learningOutcomes && outcomeIds !== undefined) {
    if (!outcomeIds.length && !parsed.data.outcomeSkipReason) return NextResponse.json({ error: "Kazanım seçin veya erteleme nedenini belirtin." }, { status: 400 });
    const validCount = outcomeIds.length ? await prisma.learningOutcome.count({ where: { id: { in: outcomeIds }, isActive: true, unit: { subject: { version: { status: "ACTIVE" } } } } }) : 0;
    if (validCount !== outcomeIds.length) return NextResponse.json({ error: "Seçilen kazanımlardan biri artık aktif değil." }, { status: 400 });
  }
  await prisma.$transaction(async (tx) => {
    await tx.assignment.update({ where: { id }, data: { title: parsed.data.title, description: parsed.data.description || null, dueAt: new Date(parsed.data.dueAt), isActive: parsed.data.isActive, ...(outcomeIds !== undefined ? { outcomeSkipReason: outcomeIds.length ? null : parsed.data.outcomeSkipReason } : {}) } });
    if (getPanelFeatureFlags().learningOutcomes && outcomeIds !== undefined) {
      await tx.assignmentOutcome.deleteMany({ where: { assignmentId: id } });
      if (outcomeIds.length) await tx.assignmentOutcome.createMany({ data: outcomeIds.map((outcomeId) => ({ assignmentId: id, outcomeId, linkedById: auth.session.userId })) });
    }
  });
  await logAudit({ actorUserId: auth.session.userId, entityType: "Assignment", entityId: id, action: "assignment.updated", summary: `${parsed.data.title} ödevi güncellendi`, payload: { isActive: parsed.data.isActive, dueAt: parsed.data.dueAt } });
  return NextResponse.json({ ok: true });
}
