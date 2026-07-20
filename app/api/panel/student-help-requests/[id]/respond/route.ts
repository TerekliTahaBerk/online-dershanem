import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getPanelFeatureFlags } from "@/lib/panel-feature-flags";
import { recordPanelProductEvent } from "@/lib/panel-product-events";
import { logAudit } from "@/lib/audit";
import { STUDENT_HELP_SLA_MS } from "@/lib/student-check-in";

const schema = z.object({ expectedVersion: z.number().int().min(1), action: z.enum(["NEXT_LESSON", "EXTRA_EXAMPLE", "PLAN_ADJUSTED", "SHORT_CHECKIN", "RESOURCE_SHARED", "NO_ACTION_NEEDED"]) }).strict();
const MAX_AGE = 365 * 24 * 60 * 60 * 1000;

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("TEACHER"); if (!auth.ok) return auth.response;
  if (!getPanelFeatureFlags().studentCheckIn) return NextResponse.json({ error: "Yardım kutusu henüz açık değil." }, { status: 404 });
  const guard = await guardMutation({ action: "panel.student_help.respond", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:student-help:${auth.session.userId}`, rateLimit: { max: 80, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null)); if (!parsed.success) return NextResponse.json({ error: "Yanıt seçimini kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const item = await prisma.studentHelpRequest.findFirst({ where: { id, status: "OPEN", group: { teacherId: auth.session.userId, isActive: true }, checkIn: { shareWithTeacher: true } }, include: { student: { include: { user: { select: { id: true } } } }, responses: { select: { id: true } } } });
  if (!item) return NextResponse.json({ error: "Yardım isteği bulunamadı." }, { status: 404 });
  const enrollment = await prisma.enrollment.findFirst({ where: { studentId: item.studentId, groupId: item.groupId, endedAt: null }, select: { id: true } });
  if (!enrollment) return NextResponse.json({ error: "Yardım isteği bulunamadı." }, { status: 404 });
  const now = new Date();
  const firstResponse = !item.firstResponseAt;
  const changed = await prisma.$transaction(async (tx) => {
    const updated = await tx.studentHelpRequest.updateMany({ where: { id, status: "OPEN", version: parsed.data.expectedVersion }, data: { status: "RESPONDED", firstResponseAt: item.firstResponseAt || now, helpful: null, version: { increment: 1 } } });
    if (updated.count !== 1) return false;
    await tx.studentHelpResponse.create({ data: { requestId: id, respondedById: auth.session.userId, action: parsed.data.action } });
    await tx.notification.create({ data: { userId: item.student.user.id, type: "SYSTEM", title: "Öğretmenin yardım isteğine döndü", body: "Planlanan küçük destek adımını görebilirsin.", href: "/panel/ogrenci/check-in" } });
    return true;
  });
  if (!changed) return NextResponse.json({ error: "İstek başka bir sekmede yanıtlandı." }, { status: 409 });
  const responseTimeMs = Math.min(MAX_AGE, Math.max(0, now.getTime() - item.createdAt.getTime()));
  await logAudit({ actorUserId: auth.session.userId, entityType: "StudentHelpRequest", entityId: id, action: "student_help.responded", summary: "Kontrollü destek adımı seçildi", payload: { action: parsed.data.action, firstResponse } });
  await recordPanelProductEvent({ name: "student_help_responded", properties: { action: parsed.data.action, responseTimeMs, within24h: responseTimeMs <= STUDENT_HELP_SLA_MS, responseNumber: item.responses.length + 1, firstResponse } }, auth.session.role);
  return NextResponse.json({ responded: true });
}
