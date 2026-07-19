import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { learningMaterialAccessScope } from "@/lib/auth/resource-scopes";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.materials.archive", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:materials:archive:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const { id } = await context.params; const material = await prisma.learningMaterial.findFirst({ where: { id, ...learningMaterialAccessScope(auth.session.role, auth.session.userId) }, select: { id: true } });
  if (!material) return NextResponse.json({ error: "Materyal bulunamadı." }, { status: 404 });
  await prisma.$transaction([
    prisma.learningMaterial.update({ where: { id }, data: { isActive: false } }),
    prisma.auditLog.create({ data: { actorUserId: auth.session.userId, actorType: "USER", entityType: "LearningMaterial", entityId: id, action: "material.archived", summary: "Öğrenme materyali arşivlendi" } }),
  ]);
  return NextResponse.json({ ok: true });
}
