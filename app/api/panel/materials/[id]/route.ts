import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.materials.archive", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:materials:archive:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const { id } = await context.params; const material = await prisma.learningMaterial.findFirst({ where: { id, ...(auth.session.role === "TEACHER" ? { group: { teacherId: auth.session.userId } } : {}) }, select: { id: true } });
  if (!material) return NextResponse.json({ error: "Materyal bulunamadı." }, { status: 404 });
  await prisma.learningMaterial.update({ where: { id }, data: { isActive: false } }); return NextResponse.json({ ok: true });
}
