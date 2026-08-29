import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

const schema = z.object({ goal: z.string().trim().min(3).max(180) });

export async function PATCH(request: Request) {
  const auth = await requireApiOdRole("STUDENT");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.student.weekly_goal", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:weekly-goal:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Hedef 3–180 karakter arasında olmalı." }, { status: 400 });
  const profile = await prisma.studentProfile.findUnique({ where: { userId: auth.session.userId }, select: { id: true } });
  if (!profile) return NextResponse.json({ error: "Öğrenci profili bulunamadı." }, { status: 404 });
  await prisma.studentProfile.update({ where: { id: profile.id }, data: { weeklyGoal: parsed.data.goal, weeklyGoalUpdatedAt: new Date() } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "StudentProfile", entityId: profile.id, action: "student.weekly_goal_updated", summary: "Haftalık hedef güncellendi" });
  return NextResponse.json({ goal: parsed.data.goal });
}
