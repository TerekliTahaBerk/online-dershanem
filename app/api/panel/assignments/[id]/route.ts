import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ title: z.string().trim().min(2).max(140), description: z.string().trim().max(2000).optional(), dueAt: z.string().datetime(), isActive: z.boolean() });

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
  await prisma.assignment.update({ where: { id }, data: { title: parsed.data.title, description: parsed.data.description || null, dueAt: new Date(parsed.data.dueAt), isActive: parsed.data.isActive } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "Assignment", entityId: id, action: "assignment.updated", summary: `${parsed.data.title} ödevi güncellendi`, payload: { isActive: parsed.data.isActive, dueAt: parsed.data.dueAt } });
  return NextResponse.json({ ok: true });
}
