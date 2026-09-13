import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { OVERLOAD_OPTIONS } from "@/lib/adaptive-plan-overload";

const schema = z.object({
  category: z.enum(["TOO_MUCH", "WRONG_DAYS", "PRIORITY", "OTHER"]),
  expectedVersion: z.number().int().min(1),
  overwhelmPulse: z.number().int().min(1).max(5).nullable().optional(),
  option: z.enum(OVERLOAD_OPTIONS).optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.adaptive_plan.request_change", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:plan-change:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Değişiklik nedenini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const profile = await prisma.studentProfile.findUnique({
    where: { userId: auth.session.userId },
    select: { id: true },
  });
  if (!profile) return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 });
  const currentPlan = await prisma.weeklyPlan.findFirst({
    where: { id, student: { userId: auth.session.userId } },
    select: { status: true },
  });
  if (!currentPlan) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });
  if (currentPlan.status === "CHANGE_REQUESTED") return NextResponse.json({ error: "Bu plan için değişiklik talebin zaten iletildi." }, { status: 409 });
  if (currentPlan.status !== "APPROVED") return NextResponse.json({ error: "Yalnız onaylı plan için değişiklik isteyebilirsin." }, { status: 409 });
  const updated = await prisma.weeklyPlan.updateMany({
    where: { id, version: parsed.data.expectedVersion, status: "APPROVED", student: { userId: auth.session.userId } },
    data: { status: "CHANGE_REQUESTED", changeRequestCategory: parsed.data.category, version: { increment: 1 } },
  });
  if (updated.count !== 1) return NextResponse.json({ error: "Onaylı plan bulunamadı veya plan değişti." }, { status: 409 });
  if (typeof parsed.data.overwhelmPulse !== "undefined") {
    await prisma.studentPlanPreference.upsert({
      where: { studentId: profile.id },
      create: {
        studentId: profile.id,
        availableDays: [1, 3, 5],
        minutesPerDay: 45,
        planningEnabled: true,
        overwhelmPulse: parsed.data.overwhelmPulse,
      },
      update: { overwhelmPulse: parsed.data.overwhelmPulse },
    });
    await recordPanelProductEvent(
      {
        name: "plan_overload_reported",
        properties: {
          category: parsed.data.category,
          overwhelmPulse: parsed.data.overwhelmPulse ?? null,
          option: parsed.data.option ?? "UNSPECIFIED",
        },
      },
      auth.session.role,
    );
  }
  await recordPanelProductEvent({
    name: "plan_change_requested",
    properties: { category: parsed.data.category, option: parsed.data.option ?? "UNSPECIFIED" },
  }, auth.session.role);
  return NextResponse.json({ requested: true });
}
