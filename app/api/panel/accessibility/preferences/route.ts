import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { activeViewPreferenceCount } from "@/lib/accessibility-preferences";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";

const schema = z.object({ expectedVersion: z.number().int().min(0), reducedMotion: z.boolean(), highContrast: z.boolean(), textScale: z.enum(["DEFAULT", "LARGE"]), comfortableSpacing: z.boolean(), captionsPreferred: z.boolean(), transcriptPreferred: z.boolean() }).strict();

export async function PATCH(request: Request) {
  const auth = await requireApiRole("ADMIN", "TEACHER", "STUDENT", "PARENT"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().accessibilityProfile) return NextResponse.json({ error: "Erişilebilirlik profili henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.accessibility.preferences", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:accessibility:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Erişilebilirlik tercihlerini kontrol edin." }, { status: 400 });
  const { expectedVersion, ...preference } = parsed.data;
  try {
    if (expectedVersion === 0) {
      const exists = await prisma.accessibilityPreference.findUnique({ where: { userId: auth.session.userId }, select: { version: true } });
      if (exists) return NextResponse.json({ error: "Tercihler başka bir sekmede değişti." }, { status: 409 });
      await prisma.accessibilityPreference.create({ data: { userId: auth.session.userId, ...preference } });
    } else {
      const changed = await prisma.accessibilityPreference.updateMany({ where: { userId: auth.session.userId, version: expectedVersion }, data: { ...preference, version: { increment: 1 } } });
      if (changed.count !== 1) return NextResponse.json({ error: "Tercihler başka bir sekmede değişti." }, { status: 409 });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Tercihler başka bir sekmede oluşturuldu." }, { status: 409 });
    throw error;
  }
  const activePreferenceCount = activeViewPreferenceCount(preference);
  await logAudit({ actorUserId: auth.session.userId, entityType: "AccessibilityPreference", entityId: auth.session.userId, action: "accessibility.self_updated", summary: "Kullanıcı işlevsel panel tercihlerini güncelledi", payload: { activePreferenceCount } });
  await recordPanelProductEvent({ name: "accessibility_preferences_updated", properties: { activePreferenceCount, reducedMotion: preference.reducedMotion, highContrast: preference.highContrast, largeText: preference.textScale === "LARGE", comfortableSpacing: preference.comfortableSpacing, captionsPreferred: preference.captionsPreferred, transcriptPreferred: preference.transcriptPreferred } }, auth.session.role);
  return NextResponse.json({ saved: true, version: expectedVersion === 0 ? 1 : expectedVersion + 1 });
}
