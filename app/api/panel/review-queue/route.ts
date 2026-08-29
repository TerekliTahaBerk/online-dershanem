import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { initialReviewDueAt } from "@/lib/review-scheduler";
import { logAudit } from "@/lib/audit";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const schema = z.object({ studentId: z.string().min(1), title: z.string().trim().min(3).max(140), sourceReference: z.string().trim().min(2).max(240), outcomeId: z.string().min(1).nullable().optional() });

export async function POST(request: Request) {
  const auth = await requireApiOdRole("ADMIN", "TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().reviewQueue) return NextResponse.json({ error: "Tekrar kuyruğu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.review_item.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:review-item:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Tekrar kaynağını kontrol edin." }, { status: 400 });
  const student = await prisma.studentProfile.findFirst({ where: { id: parsed.data.studentId, user: { status: "ACTIVE" }, ...(auth.session.role === "TEACHER" ? { enrollments: { some: { endedAt: null, group: { teacherId: auth.session.userId, isActive: true } } } } : {}) }, select: { id: true } });
  if (!student) return NextResponse.json({ error: "Yetkili olduğunuz öğrenci bulunamadı." }, { status: 404 });
  if (parsed.data.outcomeId) { const valid = await prisma.learningOutcome.count({ where: { id: parsed.data.outcomeId, isActive: true } }); if (!valid) return NextResponse.json({ error: "Kazanım bulunamadı." }, { status: 400 }); }
  const item = await prisma.reviewItem.create({ data: { studentId: student.id, sourceType: "TEACHER_REFERENCE", outcomeId: parsed.data.outcomeId || null, createdById: auth.session.userId, title: parsed.data.title, sourceReference: parsed.data.sourceReference, dueAt: initialReviewDueAt(new Date()) } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "ReviewItem", entityId: item.id, action: "review_item.created", summary: "Öğretmen kaynaklı tekrar öğesi oluşturuldu", payload: { sourceType: item.sourceType, hasOutcome: Boolean(item.outcomeId) } });
  await recordPanelProductEvent({ name: "review_items_created", properties: { sourceType: "TEACHER_REFERENCE", itemCount: 1 } }, auth.session.role);
  return NextResponse.json({ id: item.id });
}
