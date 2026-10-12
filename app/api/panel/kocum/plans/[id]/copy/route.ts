import { coachCopySchema, copyCoachPlan } from "@/lib/panel/coach-preparation-operations";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { assertAssignedCoach } from "@/lib/kocum/access-server";

/** Plan kopyala + isteğe bağlı önceki haftadan eksikleri taşı. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.kocum.plan_copy",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-copy:${auth.session.userId}`,
    rateLimit: { max: 30, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const { id } = await context.params;
  const parsed = coachCopySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const source = await prisma.weeklyPlan.findUnique({
    where: { id },
    include: { tasks: { orderBy: [{ scheduledFor: "asc" }, { position: "asc" }] } },
  });
  if (!source) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });

  const allowed = await assertAssignedCoach({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: source.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  return copyCoachPlan(parsed.data, auth.session.userId, auth.session.fullName || "Koç", prisma, id);
}
