import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { assertCoachOrTeacherAccess } from "@/lib/kocum/access-server";
import { applyTemplateToStudentWeek } from "@/lib/kocum/server";
import { istanbulWeekStart } from "@/lib/istanbul-time";

const bodySchema = z.object({
  studentId: z.string().min(1),
  weekStart: z.string().datetime().optional(),
});

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.kocum.template_apply",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-template:${auth.session.userId}`,
    rateLimit: { max: 40, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const { id } = await context.params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const allowed = await assertCoachOrTeacherAccess({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: parsed.data.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  const result = await applyTemplateToStudentWeek({
    templateId: id,
    studentId: parsed.data.studentId,
    weekStart: parsed.data.weekStart ? new Date(parsed.data.weekStart) : istanbulWeekStart(new Date()),
    actorUserId: auth.session.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, planId: result.planId, version: result.version });
}
