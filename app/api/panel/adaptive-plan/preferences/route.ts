import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({
  availableDays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  minutesPerDay: z.union([z.literal(20), z.literal(30), z.literal(45), z.literal(60), z.literal(90)]),
  nextExamAt: z.string().datetime().nullable().default(null),
  examLabel: z.enum(["LGS", "TYT", "AYT", "YDT", "OKUL SINAVI"]).nullable().default(null),
  planningEnabled: z.boolean().default(true),
  overwhelmPulse: z.number().int().min(1).max(5).nullable().default(null),
});

export async function PATCH(request: Request) {
  const auth = await requireApiRole("STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.adaptive_plan.preferences", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:plan-pref:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Plan tercihlerini kontrol edin." }, { status: 400 });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 });
  const availableDays = [...new Set(parsed.data.availableDays)].sort();
  const nextExamAt = parsed.data.nextExamAt ? new Date(parsed.data.nextExamAt) : null;
  if (nextExamAt && (nextExamAt <= new Date() || nextExamAt > new Date(Date.now() + 366 * 86400000))) return NextResponse.json({ error: "Sınav tarihi gelecek bir yıl içinde olmalı." }, { status: 400 });
  const preference = await prisma.studentPlanPreference.upsert({ where: { studentId: profile.id }, create: { studentId: profile.id, availableDays, minutesPerDay: parsed.data.minutesPerDay, nextExamAt, examLabel: nextExamAt ? parsed.data.examLabel : null, planningEnabled: parsed.data.planningEnabled, overwhelmPulse: parsed.data.overwhelmPulse }, update: { availableDays, minutesPerDay: parsed.data.minutesPerDay, nextExamAt, examLabel: nextExamAt ? parsed.data.examLabel : null, planningEnabled: parsed.data.planningEnabled, overwhelmPulse: parsed.data.overwhelmPulse } });
  await recordPanelProductEvent({ name: "plan_preference_updated", properties: { availableDayCount: availableDays.length, minutesPerDay: preference.minutesPerDay, planningEnabled: preference.planningEnabled, overwhelmPulse: preference.overwhelmPulse } }, auth.session.role);
  return NextResponse.json({ saved: true });
}
