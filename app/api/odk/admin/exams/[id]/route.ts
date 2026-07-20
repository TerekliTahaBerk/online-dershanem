import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { updateExamScheduleSchema } from "@/lib/odk/admin-schemas";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:exam-update:${auth.session.userId}`, rateLimit: { max: 90, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = updateExamScheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Planlama alanlarını kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const current = await prisma.odkExam.findFirst({ where: { id, status: { in: ["DRAFT", "READY"] } }, select: { id: true } });
  if (!current) return NextResponse.json({ error: "Yalnız taslak veya hazır deneme düzenlenebilir." }, { status: 409 });
  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;
  const exam = await prisma.odkExam.update({ where: { id }, data: { title: parsed.data.title, startsAt, endsAt, lateEntryMinutes: parsed.data.lateEntryMinutes, meetRequired: parsed.data.meetRequired, meetUrl: parsed.data.meetUrl || null } });
  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.exam_updated", summary: "ODK deneme planlama bilgileri güncellendi" });
  return NextResponse.json({ exam: { id: exam.id } });
}
