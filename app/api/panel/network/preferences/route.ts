import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiActiveUser } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";

const schema = z.object({ expectedVersion: z.number().int().min(0), lowDataMode: z.boolean(), offlineWritesEnabled: z.boolean() }).strict();

export async function PATCH(request: Request) {
  const auth = await requireApiActiveUser();
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().offlineMode) return NextResponse.json({ error: "Düşük veri modu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.network_preferences.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:network-preferences:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Veri kullanımı tercihlerini kontrol edin." }, { status: 400 });
  const existing = await prisma.networkPreference.findUnique({ where: { userId: auth.session.userId }, select: { version: true } });
  if ((existing?.version || 0) !== parsed.data.expectedVersion) return NextResponse.json({ error: "Tercihler başka bir sekmede değişti. Sayfayı yenileyin.", code: "VERSION_CONFLICT" }, { status: 409 });
  let preference;
  try {
    preference = existing
      ? await prisma.networkPreference.update({ where: { userId: auth.session.userId }, data: { lowDataMode: parsed.data.lowDataMode, offlineWritesEnabled: parsed.data.offlineWritesEnabled, version: { increment: 1 } } })
      : await prisma.networkPreference.create({ data: { userId: auth.session.userId, lowDataMode: parsed.data.lowDataMode, offlineWritesEnabled: parsed.data.offlineWritesEnabled } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return NextResponse.json({ error: "Tercihler başka bir sekmede oluşturuldu. Sayfayı yenileyin.", code: "VERSION_CONFLICT" }, { status: 409 });
    throw error;
  }
  await logAudit({ actorUserId: auth.session.userId, entityType: "NetworkPreference", entityId: auth.session.userId, action: "network.preferences_updated", summary: "Düşük veri ve çevrimdışı yazma tercihleri güncellendi", payload: { lowDataMode: preference.lowDataMode, offlineWritesEnabled: preference.offlineWritesEnabled } });
  await recordPanelProductEvent({ name: "network_preferences_updated", properties: { lowDataMode: preference.lowDataMode, offlineWritesEnabled: preference.offlineWritesEnabled } }, auth.session.role);
  return NextResponse.json({ version: preference.version, lowDataMode: preference.lowDataMode, offlineWritesEnabled: preference.offlineWritesEnabled });
}
