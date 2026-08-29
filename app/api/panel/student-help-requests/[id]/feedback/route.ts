import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiOdRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { studentHelpDueAt } from "@/lib/student-check-in";

const schema = z.object({ expectedVersion: z.number().int().min(1), helpful: z.boolean() }).strict();
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiOdRole("STUDENT"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().studentCheckIn) return NextResponse.json({ error: "Check-in henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.student_help.feedback", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:student-help-feedback:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Geri bildirim geçersiz." }, { status: 400 });
  const { id } = await context.params;
  const item = await prisma.studentHelpRequest.findFirst({ where: { id, status: "RESPONDED", helpful: null, student: { userId: auth.session.userId } }, include: { group: { select: { teacherId: true } } } });
  if (!item) return NextResponse.json({ error: "Yanıtlanmış yardım isteği bulunamadı." }, { status: 404 });
  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.studentHelpRequest.updateMany({ where: { id, status: "RESPONDED", helpful: null, version: parsed.data.expectedVersion }, data: parsed.data.helpful ? { status: "CLOSED", helpful: true, version: { increment: 1 } } : { status: "OPEN", helpful: false, dueAt: studentHelpDueAt(), version: { increment: 1 } } });
    if (updated.count !== 1) return false;
    if (!parsed.data.helpful) await tx.notification.create({ data: { userId: item.group.teacherId, type: "SYSTEM", title: "Destek adımı henüz yeterli olmadı", body: "Öğrencin yeni bir kontrollü destek adımı bekliyor.", href: "/panel/ogretmen/yardim" } });
    return true;
  });
  if (!changed) return NextResponse.json({ error: "İstek başka bir sekmede değişti." }, { status: 409 });
  await recordPanelProductEvent({ name: "student_help_feedback", properties: { helpful: parsed.data.helpful } }, auth.session.role);
  return NextResponse.json({ saved: true, status: parsed.data.helpful ? "CLOSED" : "OPEN" });
}
