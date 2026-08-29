import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { aiDraftContentSchema, changedFieldCount, type AiDraftContent } from "@/lib/teacher-ai";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";

const contentSchema = aiDraftContentSchema.omit({ citations: true });
const schema = z.object({ action: z.enum(["APPROVE", "REJECT", "FLAG"]), expectedVersion: z.number().int().min(1), content: contentSchema.optional(), flagReason: z.enum(["FACTUAL_ERROR", "UNSUPPORTED_CITATION", "UNSAFE_TONE", "PRIVACY", "OTHER"]).optional() }).strict();
const ageBand = (ms: number) => ms <= 5 * 60_000 ? "0-5M" as const : ms <= 86_400_000 ? "6M-24H" as const : "24H+" as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().teacherAiDrafts) return NextResponse.json({ error: "AI taslak pilotu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.ai_draft.review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:ai-review:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "İnceleme alanlarını kontrol edin." }, { status: 400 });
  if (parsed.data.action === "APPROVE" && !parsed.data.content) return NextResponse.json({ error: "Onaylanan içeriği kontrol edin." }, { status: 400 });
  if (parsed.data.action === "FLAG" && !parsed.data.flagReason) return NextResponse.json({ error: "Kontrollü hata nedeni seçin." }, { status: 400 });
  const { id } = await params; const draft = await prisma.teacherAiDraft.findFirst({ where: { id, teacherId: auth.session.userId }, select: { id: true, taskType: true, status: true, provider: true, version: true, createdAt: true, originalContent: true } });
  if (!draft) return NextResponse.json({ error: "Yetkili olduğunuz taslak bulunamadı." }, { status: 404 });
  if (draft.status !== "DRAFT" || draft.version !== parsed.data.expectedVersion) return NextResponse.json({ error: "Taslak başka bir işlemde güncellendi." }, { status: 409 });
  const original = aiDraftContentSchema.parse(draft.originalContent); const reviewed = parsed.data.content ? { ...parsed.data.content, citations: original.citations } satisfies AiDraftContent : null;
  const changed = reviewed ? changedFieldCount(original, reviewed) : 0;
  const result = await prisma.teacherAiDraft.updateMany({ where: { id, teacherId: auth.session.userId, status: "DRAFT", version: parsed.data.expectedVersion }, data: { status: parsed.data.action === "APPROVE" ? "APPROVED" : parsed.data.action === "FLAG" ? "FLAGGED" : "REJECTED", reviewedContent: reviewed as Prisma.InputJsonValue | undefined, flagReason: parsed.data.action === "FLAG" ? parsed.data.flagReason : null, reviewedAt: new Date(), version: { increment: 1 } } });
  if (!result.count) return NextResponse.json({ error: "Taslak başka bir işlemde güncellendi." }, { status: 409 });
  const action = parsed.data.action === "APPROVE" ? (changed ? "EDIT" : "ACCEPT") : parsed.data.action === "FLAG" ? "FLAG" : "REJECT";
  await recordPanelProductEvent({ name: "ai_draft_reviewed", properties: { taskType: draft.taskType, provider: draft.provider, action, changedFieldCount: changed, reviewAgeBand: ageBand(Date.now() - draft.createdAt.getTime()) } }, auth.session.role);
  await logAudit({ actorUserId: auth.session.userId, entityType: "TeacherAiDraft", entityId: id, action: `teacher_ai_draft.${parsed.data.action.toLowerCase()}`, summary: "Öğretmen AI taslağını inceledi", payload: { taskType: draft.taskType, provider: draft.provider, changedFieldCount: changed, flagReason: parsed.data.flagReason || null } });
  return NextResponse.json({ ok: true, status: parsed.data.action === "APPROVE" ? "APPROVED" : parsed.data.action === "FLAG" ? "FLAGGED" : "REJECTED", version: draft.version + 1 });
}
