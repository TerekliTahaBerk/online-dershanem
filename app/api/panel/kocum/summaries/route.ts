import { coachSummarySchema, saveCoachSummary } from "@/lib/panel/coach-preparation-operations";
import { NextResponse } from "next/server";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { assertAssignedCoach } from "@/lib/kocum/access-server";

export async function POST(request: Request) {
  const auth = await requireApiProductRole("OK", "ADMIN", "TEACHER");
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.kocum.summary_upsert",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:kocum-summary:${auth.session.userId}`,
    rateLimit: { max: 40, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  }

  const parsed = coachSummarySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Özet geçerli görünmüyor." }, { status: 400 });
  }

  const allowed = await assertAssignedCoach({
    role: auth.session.role as "ADMIN" | "TEACHER",
    userId: auth.session.userId,
    studentProfileId: parsed.data.studentId,
  });
  if (!allowed) return NextResponse.json({ error: "Bu öğrenci için yetkiniz bulunmuyor." }, { status: 403 });

  return saveCoachSummary(parsed.data, auth.session.userId, auth.session.fullName || "Koç");
}
