import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { logAudit } from "@/lib/audit";
import { recordPanelProductEvent } from "@/lib/panel-product-events";

const category = z.enum(["KNOWLEDGE", "PROCESS", "ATTENTION", "TIME", "BLANK"]);
const schema = z.object({ reasons: z.array(z.object({ sectionId: z.string().min(1), categories: z.array(category).max(3) })).max(8), nextAction: z.string().trim().max(240).nullable().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN", "TEACHER", "STUDENT");
  if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().mockExamAnalysis) return NextResponse.json({ error: "Deneme analizi henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.mock_exam.review", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:mock-exam-review:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Hata nedenlerini kontrol edin." }, { status: 400 });
  if (parsed.data.reasons.reduce((sum, item) => sum + new Set(item.categories).size, 0) > 3) return NextResponse.json({ error: "Bir deneme için en fazla üç hata nedeni seçilebilir." }, { status: 400 });
  if (auth.session.role === "STUDENT" && parsed.data.nextAction !== undefined) return NextResponse.json({ error: "Sonraki eylemi yalnız öğretmen veya admin onaylayabilir." }, { status: 403 });
  const { id } = await params;
  const exam = await prisma.mockExam.findFirst({ where: { id, ...(auth.session.role === "STUDENT" ? { student: { userId: auth.session.userId } } : auth.session.role === "TEACHER" ? { student: { enrollments: { some: { endedAt: null, group: { teacherId: auth.session.userId, isActive: true } } } } } : {}) }, include: { sections: { include: { errors: true } } } });
  if (!exam) return NextResponse.json({ error: "Yetkili olduğunuz deneme bulunamadı." }, { status: 404 });
  const sectionIds = new Set(exam.sections.map((section) => section.id));
  if (parsed.data.reasons.some((item) => !sectionIds.has(item.sectionId) || new Set(item.categories).size !== item.categories.length)) return NextResponse.json({ error: "Geçersiz bölüm veya tekrar eden hata nedeni." }, { status: 400 });
  const before = exam.sections.flatMap((section) => section.errors.map((error) => `${section.id}:${error.category}`)).sort();
  const after = parsed.data.reasons.flatMap((section) => section.categories.map((error) => `${section.sectionId}:${error}`)).sort();
  await prisma.$transaction(async (tx) => {
    await tx.mockExamSectionError.deleteMany({ where: { sectionId: { in: [...sectionIds] } } });
    for (const section of parsed.data.reasons) if (section.categories.length) await tx.mockExamSectionError.createMany({ data: section.categories.map((errorCategory) => ({ sectionId: section.sectionId, category: errorCategory, revisedById: auth.session.role === "STUDENT" ? null : auth.session.userId })) });
    if (parsed.data.nextAction !== undefined) await tx.mockExam.update({ where: { id }, data: { nextAction: parsed.data.nextAction || null, nextActionApprovedAt: parsed.data.nextAction ? new Date() : null, reviewedById: parsed.data.nextAction ? auth.session.userId : null } });
  });
  const changed = before.filter((item) => !after.includes(item)).length + after.filter((item) => !before.includes(item)).length;
  await logAudit({ actorUserId: auth.session.userId, entityType: "MockExam", entityId: id, action: "mock_exam.reasons_revised", summary: "Deneme hata nedenleri güncellendi", payload: { changedCount: changed, reasonCount: after.length, nextActionApproved: Boolean(parsed.data.nextAction) } });
  if (changed) await recordPanelProductEvent({ name: "error_reason_revised", properties: { examType: exam.exam, actorRole: auth.session.role as "ADMIN" | "TEACHER" | "STUDENT", changedCount: changed, reasonCount: after.length } }, auth.session.role);
  return new NextResponse(null, { status: 204 });
}
