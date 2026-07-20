import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { getOdkExamReadiness } from "@/lib/odk/admin-exam-server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.lock", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:exam-lock:${auth.session.userId}`, rateLimit: { max: 30, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const { exam, issues } = await getOdkExamReadiness(id);
  if (!exam?.currentVersion || exam.status !== "DRAFT" || exam.currentVersion.status !== "DRAFT") return NextResponse.json({ error: "Yalnız taslak sürüm kilitlenebilir." }, { status: 409 });
  const errors = issues.filter((issue) => issue.level === "error");
  if (errors.length) return NextResponse.json({ error: "Yayın kontrolleri tamamlanmadı.", issues }, { status: 400 });
  await prisma.$transaction([prisma.odkExamVersion.update({ where: { id: exam.currentVersion.id }, data: { status: "LOCKED", lockedAt: new Date() } }), prisma.odkExam.update({ where: { id }, data: { status: "READY" } })]);
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.exam_version_locked", summary: "Sınav sürümü kilitlendi ve planlamaya hazırlandı", payload: { warningCount: issues.length } });
  return NextResponse.json({ status: "READY", issues });
}
