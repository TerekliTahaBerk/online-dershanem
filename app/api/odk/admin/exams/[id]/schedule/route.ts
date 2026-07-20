import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { validateSchedule } from "@/lib/odk/exam-domain";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.schedule", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:exam-schedule:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const exam = await prisma.odkExam.findFirst({ where: { id, status: "READY", currentVersion: { status: "LOCKED" } }, select: { startsAt: true, endsAt: true, meetRequired: true, meetUrl: true } });
  if (!exam) return NextResponse.json({ error: "Deneme planlamaya hazır değil." }, { status: 409 });
  const issues = validateSchedule(exam);
  if (issues.length) return NextResponse.json({ error: issues[0].message, issues }, { status: 400 });
  await prisma.odkExam.update({ where: { id }, data: { status: "SCHEDULED", publishedAt: new Date() } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.exam_scheduled", summary: "ODK denemesi planlandı ve erişim hazırlığına açıldı" });
  return NextResponse.json({ status: "SCHEDULED" });
}
