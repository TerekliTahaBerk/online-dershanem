import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiAccountRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { notificationTimingSchema } from "@/lib/notification-delivery";

/**
 * Bildirim tercihleri.
 *
 * GERİYE UYUM (M5):
 *  - Web (varsayılan): eskisi gibi TAM gövde zorunlu; eksik / bilinmeyen alan
 *    400. Yeni `pushEnabled` / `examUpdates` web gövdesinde isteğe bağlıdır;
 *    gönderilmezse mevcut değer KORUNUR (web formu push'u kapatmaz).
 *  - Mobil (`x-od-client: mobile`): yalnız değiştirdiği alanları gönderebilir;
 *    gövde mevcut kayıtla BİRLEŞTİRİLİR, sonra aynı tam şemayla doğrulanır.
 *    `x-od-client` yalnız gövde biçimini seçer; yetki değildir.
 */
const channelFields = {
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  lessonSummary: z.boolean(),
  weeklyDigest: z.boolean(),
  absence: z.boolean(),
  assignment: z.boolean(),
  payment: z.boolean(),
};

const fullSchema = notificationTimingSchema.safeExtend({ ...channelFields, pushEnabled: z.boolean(), examUpdates: z.boolean() }).strict();

/** Web formunun gövdesi: eski tam şema + isteğe bağlı yeni M5 alanları. */
const webSchema = notificationTimingSchema.safeExtend({ ...channelFields, pushEnabled: z.boolean().optional(), examUpdates: z.boolean().optional() }).strict();

const patchSchema = z.object({
  inAppEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
  lessonSummary: z.boolean(),
  weeklyDigest: z.boolean(),
  absence: z.boolean(),
  assignment: z.boolean(),
  payment: z.boolean(),
  pushEnabled: z.boolean(),
  examUpdates: z.boolean(),
  quietStartMinute: z.number().int().min(0).max(1439).nullable(),
  quietEndMinute: z.number().int().min(0).max(1439).nullable(),
  dailyDigest: z.boolean(),
  dailyDigestMinute: z.number().int().min(0).max(1439).nullable(),
}).partial().strict();

const DEFAULTS = {
  inAppEnabled: true,
  emailEnabled: false,
  whatsappEnabled: false,
  lessonSummary: true,
  weeklyDigest: true,
  absence: true,
  assignment: true,
  payment: true,
  pushEnabled: false,
  examUpdates: true,
  quietStartMinute: null as number | null,
  quietEndMinute: null as number | null,
  dailyDigest: false,
  dailyDigestMinute: null as number | null,
};

async function current(userId: string) {
  const row = await prisma.notificationPreference.findUnique({ where: { userId } });
  if (!row) return { ...DEFAULTS };
  return {
    inAppEnabled: row.inAppEnabled,
    emailEnabled: row.emailEnabled,
    whatsappEnabled: row.whatsappEnabled,
    lessonSummary: row.lessonSummary,
    weeklyDigest: row.weeklyDigest,
    absence: row.absence,
    assignment: row.assignment,
    payment: row.payment,
    pushEnabled: row.pushEnabled,
    examUpdates: row.examUpdates,
    quietStartMinute: row.quietStartMinute,
    quietEndMinute: row.quietEndMinute,
    dailyDigest: row.dailyDigest,
    dailyDigestMinute: row.dailyDigestMinute,
  };
}

export async function GET() {
  const auth = await requireApiAccountRole("PARENT", "STUDENT");
  if (!auth.ok) return auth.response;
  return NextResponse.json({ preferences: await current(auth.session.userId) }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(request: Request) {
  const auth = await requireApiAccountRole("PARENT", "STUDENT"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.notification_preferences", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:notification-prefs:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const body = await request.json().catch(() => null);
  const existing = await current(auth.session.userId);
  const patch = request.headers.get("x-od-client") === "mobile" ? patchSchema.safeParse(body) : webSchema.safeParse(body); if (!patch.success) return NextResponse.json({ error: "Tercihleri kontrol edin." }, { status: 400 });
  const parsed = fullSchema.safeParse({ ...existing, ...patch.data, pushEnabled: patch.data.pushEnabled ?? existing.pushEnabled, examUpdates: patch.data.examUpdates ?? existing.examUpdates }); if (!parsed.success) return NextResponse.json({ error: "Tercihleri kontrol edin." }, { status: 400 });
  await prisma.notificationPreference.upsert({ where: { userId: auth.session.userId }, create: { userId: auth.session.userId, ...parsed.data }, update: parsed.data });
  if (getPanelFeatureFlags().parentWeeklyDigest && patch.data.weeklyDigest !== undefined) { const actorRole = auth.session.role === "STUDENT" ? "STUDENT" as const : "PARENT" as const; await recordPanelProductEvent({ name: "weekly_digest_preference_updated", properties: { actorRole, enabled: parsed.data.weeklyDigest, emailEnabled: parsed.data.emailEnabled } }, auth.session.role); }
  return NextResponse.json({ ok: true, preferences: parsed.data });
}
