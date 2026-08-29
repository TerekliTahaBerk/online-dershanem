import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const schema = z.object({ status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.curriculum.version.status", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:curriculum:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Sürüm durumu geçersiz." }, { status: 400 });
  const { id } = await context.params;
  const version = await prisma.curriculumVersion.findUnique({ where: { id }, select: { id: true, code: true } });
  if (!version) return NextResponse.json({ error: "Müfredat sürümü bulunamadı." }, { status: 404 });
  await prisma.$transaction([
    prisma.curriculumVersion.update({ where: { id }, data: { status: parsed.data.status } }),
    prisma.auditLog.create({ data: { actorUserId: auth.session.userId, actorType: "USER", entityType: "CurriculumVersion", entityId: id, action: "curriculum.version_status_changed", summary: `${version.code} sürümü ${parsed.data.status} durumuna alındı`, payload: { status: parsed.data.status } } }),
  ]);
  return NextResponse.json({ ok: true });
}
