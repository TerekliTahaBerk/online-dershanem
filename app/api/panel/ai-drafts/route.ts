import { teacherAiCreateSchema, createTeacherAiDraft } from "@/lib/panel/teacher-ai-drafts-server";
import { NextResponse } from "next/server";
import { requireStaffApi } from "@/lib/panel/staff-api";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";

export async function POST(request: Request) {
  const auth = await requireStaffApi("OD", "od:lesson:teach"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().teacherAiDrafts) return NextResponse.json({ error: "AI taslak pilotu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.ai_draft.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:ai-draft:${auth.session.userId}`, rateLimit: { max: 20, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = teacherAiCreateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ders ve taslak türünü kontrol edin." }, { status: 400 });
  return createTeacherAiDraft(parsed.data, auth.session.userId);
}
