import { teacherAiReviewSchema, reviewTeacherAiDraft } from "@/lib/panel/teacher-ai-drafts-server";
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/panel/staff-api";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireStaffApi("OD", "od:lesson:teach"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().teacherAiDrafts) return NextResponse.json({ error: "AI taslak pilotu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.ai_draft.review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:ai-review:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = teacherAiReviewSchema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "İnceleme alanlarını kontrol edin." }, { status: 400 });
  const { id } = await params;
  return reviewTeacherAiDraft(id, parsed.data, auth.session.userId);
}
