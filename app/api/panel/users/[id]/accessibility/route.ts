import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";

const schema = z.object({ expectedVersion: z.number().int().min(0), assessmentExtraPercent: z.union([z.literal(0), z.literal(25), z.literal(50), z.literal(100)]), breaksAllowed: z.boolean() }).strict();
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().accessibilityProfile) return NextResponse.json({ error: "Erişilebilirlik profili henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.accessibility.accommodation", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:accessibility-admin:${auth.session.userId}`, rateLimit: { max: 40, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Akademik düzenleme seçimini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const target = await prisma.user.findFirst({ where: { id, role: "STUDENT", status: "ACTIVE" }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "Aktif öğrenci bulunamadı." }, { status: 404 });
  const { expectedVersion, ...academic } = parsed.data; const now = new Date();
  try {
    if (expectedVersion === 0) {
      const exists = await prisma.accessibilityPreference.findUnique({ where: { userId: id }, select: { version: true } });
      if (exists) return NextResponse.json({ error: "Profil başka bir sekmede değişti." }, { status: 409 });
      await prisma.accessibilityPreference.create({ data: { userId: id, ...academic, academicUpdatedById: auth.session.userId, academicUpdatedAt: now } });
    } else {
      const changed = await prisma.accessibilityPreference.updateMany({ where: { userId: id, version: expectedVersion }, data: { ...academic, academicUpdatedById: auth.session.userId, academicUpdatedAt: now, version: { increment: 1 } } });
      if (changed.count !== 1) return NextResponse.json({ error: "Profil başka bir sekmede değişti." }, { status: 409 });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Profil başka bir sekmede oluşturuldu." }, { status: 409 });
    throw error;
  }
  await prisma.notification.create({ data: { userId: id, type: "SYSTEM", title: "İşlevsel destek düzenlemen güncellendi", body: "Ek süre ve mola düzenlemeni erişilebilirlik ekranından görebilirsin.", href: "/panel/erisilebilirlik" } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "AccessibilityPreference", entityId: id, action: "accessibility.academic_updated", summary: "Öğrencinin işlevsel akademik düzenlemesi güncellendi", payload: academic });
  await recordPanelProductEvent({ name: "academic_accommodation_updated", properties: { extraTimePercent: academic.assessmentExtraPercent, breaksAllowed: academic.breaksAllowed } }, auth.session.role);
  return NextResponse.json({ saved: true, version: expectedVersion === 0 ? 1 : expectedVersion + 1 });
}
