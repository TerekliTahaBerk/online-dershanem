import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";

const schema = z.object({ parentId: z.string().min(1), studentId: z.string().min(1), relationship: z.string().trim().max(30).optional() });

export async function POST(request: Request) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.relationships.create", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:relations:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Veli ve öğrenci seçin." }, { status: 400 });
  const [parent, student] = await Promise.all([
    prisma.user.findFirst({ where: { id: parsed.data.parentId, role: "PARENT", status: "ACTIVE" }, select: { id: true } }),
    prisma.studentProfile.findUnique({ where: { id: parsed.data.studentId }, select: { id: true } }),
  ]);
  if (!parent || !student) return NextResponse.json({ error: "Veli veya öğrenci bulunamadı." }, { status: 404 });
  const relation = await prisma.parentStudent.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: student.id } },
    create: { parentId: parent.id, studentId: student.id, relationship: parsed.data.relationship || null },
    update: { relationship: parsed.data.relationship || null },
  });
  await logAudit({ actorUserId: auth.session.userId, entityType: "ParentStudent", entityId: relation.id, action: "relationship.saved", summary: "Veli–öğrenci bağlantısı kaydedildi", payload: { parentId: parent.id, studentId: student.id, relationship: parsed.data.relationship || null } });
  return NextResponse.json({ ok: true });
}
