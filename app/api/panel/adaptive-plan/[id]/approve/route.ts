import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

const schema = z.object({ expectedVersion: z.number().int().min(1) });

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.adaptive_plan.approve", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:plan-approve:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Plan sürümü geçersiz." }, { status: 400 });
  const { id } = await context.params;
  const plan = await prisma.weeklyPlan.findFirst({ where: { id, student: { enrollments: { some: { endedAt: null, group: { isActive: true, teacherId: auth.session.userId } } } } }, select: { id: true, status: true, version: true, tasks: { where: { status: "PLANNED" }, select: { id: true } } } });
  if (!plan) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });
  if (plan.status !== "DRAFT") return NextResponse.json({ error: "Yalnız taslak plan onaylanabilir." }, { status: 409 });
  if (!plan.tasks.length) return NextResponse.json({ error: "Görevi olmayan plan onaylanamaz." }, { status: 400 });
  const updated = await prisma.weeklyPlan.updateMany({ where: { id, version: parsed.data.expectedVersion, status: "DRAFT" }, data: { status: "APPROVED", approvedById: auth.session.userId, approvedAt: new Date(), version: { increment: 1 } } });
  if (updated.count !== 1) return NextResponse.json({ error: "Plan başka bir sekmede değişti. Sayfayı yenileyin." }, { status: 409 });
  return NextResponse.json({ approved: true });
}
