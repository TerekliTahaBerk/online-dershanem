import { NextResponse } from "next/server";
import { prisma as defaultDb } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";

import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { learningMaterialAccessScope } from "@/lib/auth/resource-scopes";
import { idParamsSchema, invalidApiInput } from "@/lib/api/input-validation";
import { z } from "zod";

const editSchema = z.object({ title: z.string().trim().min(2).max(140), description: z.string().trim().max(1000).optional(), isActive: z.boolean(), url: z.string().url().max(1000).refine((value) => /^https?:\/\//.test(value)).optional(), captionsAvailable: z.boolean().default(false), transcript: z.string().trim().max(8000).optional() }).strict();

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }, prisma: PrismaClient = defaultDb) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.materials.archive", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:materials:archive:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } }); if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const routeParams = idParamsSchema.safeParse(await context.params);
  if (!routeParams.success) return invalidApiInput();
  const { id } = routeParams.data; const material = await prisma.learningMaterial.findFirst({ where: { id, ...learningMaterialAccessScope(auth.session.role, auth.session.userId) }, select: { id: true } });
  if (!material) return NextResponse.json({ error: "Materyal bulunamadı; kaldırılmış ya da değişmiş olabilir." }, { status: 404 });
  const payload = await request.json().catch(() => null);
  const editing = payload && typeof payload === "object" && "title" in payload;
  if (payload !== null && (!payload || typeof payload !== "object" || Array.isArray(payload) || !editing && Object.keys(payload).length > 0)) return invalidApiInput("Materyal işlemi geçerli görünmüyor.");
  const parsed = editing ? editSchema.safeParse(payload) : null;
  if (parsed && !parsed.success) return invalidApiInput("Lütfen materyal alanlarını bir kez daha kontrol eder misiniz?");
  const edit = parsed?.success ? parsed.data : null;
  const stored = await prisma.learningMaterial.findUniqueOrThrow({ where: { id } });
  if (edit?.url && stored.blobPathname) return invalidApiInput("Yüklenen dosyanın adresi değiştirilemez.");
  await prisma.$transaction([
    prisma.learningMaterial.update({ where: { id }, data: edit ? { ...edit, captionsAvailable: stored.kind === "VIDEO" && edit.captionsAvailable } : { isActive: false } }),
    prisma.auditLog.create({ data: { actorUserId: auth.session.userId, actorType: "USER", entityType: "LearningMaterial", entityId: id, action: edit ? "material.updated" : "material.archived", summary: edit ? "Öğrenme materyali güncellendi" : "Öğrenme materyali arşivlendi" } }),
  ]);
  return NextResponse.json({ ok: true });
}
