import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("TEACHER");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.teacher.templates.delete", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:teacher-template:${auth.session.userId}`, rateLimit: { max: 40, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const { id } = await context.params;
  const removed = await prisma.teacherNoteTemplate.deleteMany({ where: { id, teacherId: auth.session.userId } });
  if (!removed.count) return NextResponse.json({ error: "Şablon bulunamadı." }, { status: 404 });
  await logAudit({ actorUserId: auth.session.userId, entityType: "TeacherNoteTemplate", entityId: id, action: "teacher.template_deleted", summary: "Kişisel şablon silindi" });
  return NextResponse.json({ ok: true });
}
