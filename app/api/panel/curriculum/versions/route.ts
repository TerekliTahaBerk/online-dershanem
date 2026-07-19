import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const code = z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9._-]+$/);
const schema = z.object({ code, title: z.string().trim().min(3).max(120), exam: z.enum(["LGS", "TYT", "AYT", "YDT"]), academicYear: z.number().int().min(2024).max(2100), sourceUrl: z.string().url().max(500).optional().or(z.literal("")) });

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.curriculum.version.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:curriculum:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Müfredat sürümü alanlarını kontrol edin." }, { status: 400 });
  const normalizedCode = parsed.data.code.toUpperCase();
  const exists = await prisma.curriculumVersion.findUnique({ where: { code: normalizedCode }, select: { id: true } });
  if (exists) return NextResponse.json({ error: "Bu sürüm kodu zaten kullanılıyor." }, { status: 409 });
  const version = await prisma.$transaction(async (tx) => {
    const created = await tx.curriculumVersion.create({ data: { ...parsed.data, code: normalizedCode, sourceUrl: parsed.data.sourceUrl || null, createdById: auth.session.userId } });
    await tx.auditLog.create({ data: { actorUserId: auth.session.userId, actorType: "USER", entityType: "CurriculumVersion", entityId: created.id, action: "curriculum.version_created", summary: `${created.code} müfredat sürümü oluşturuldu`, payload: { exam: created.exam, academicYear: created.academicYear } } });
    return created;
  });
  return NextResponse.json({ id: version.id });
}
