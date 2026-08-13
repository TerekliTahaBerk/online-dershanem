import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.relationships.delete", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:relations:delete:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const { id } = await context.params;
  const relation = await prisma.parentStudent.findUnique({
    where: { id },
    select: { id: true, parentId: true, studentId: true },
  });
  if (!relation) return NextResponse.json({ error: "Veli bağlantısı bulunamadı." }, { status: 404 });

  // Erişim kaldırma ve denetim izi aynı transaction'dadır: biri olmadan diğeri
  // gerçekleşmez. İlişki sonraki her istekte DB'den okunduğu için iptal anlıktır.
  await prisma.$transaction(async (tx) => {
    await tx.parentStudent.delete({ where: { id: relation.id } });
    await tx.auditLog.create({
      data: {
        actorUserId: auth.session.userId,
        actorType: "USER",
        entityType: "ParentStudent",
        entityId: relation.id,
        action: "relationship.access_revoked",
        summary: "Veli–öğrenci erişimi kaldırıldı",
        payload: { parentId: relation.parentId, studentId: relation.studentId },
      },
    });
  });
  return NextResponse.json({ ok: true });
}
