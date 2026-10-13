import { coachTaskSchema, createCoachTask } from "@/lib/panel/coach-preparation-operations";
import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { assertAssignedCoach } from "@/lib/kocum/access-server";

/** Koç/öğretmen manuel plan görevi ekler. ASSIGNMENT kaynaklıysa yalnız referans tutulur. */
export async function POST(request: Request) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().adaptivePlan) {
    return NextResponse.json({ error: "Haftalık plan henüz açık değil." }, { status: 404 });
  }

  const guard = await guardMutation({
    action: "panel.kocum.task_create",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-create:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const parsed = coachTaskSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz görev." }, { status: 400 });
  }

  const allowed = await assertAssignedCoach({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: parsed.data.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz yok." }, { status: 403 });

  return createCoachTask(parsed.data, auth.session.userId, auth.session.fullName || "Koç");
}
