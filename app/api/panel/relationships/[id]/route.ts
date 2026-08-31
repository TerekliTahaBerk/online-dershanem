import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";

const updateSchema = z.object({
  relationship: z.string().trim().max(30).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.relationships.update",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:relations:update:${auth.session.userId}`,
    rateLimit: { max: 80, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "İlişki bilgisini kontrol edin." }, { status: 400 });
  }

  const { id } = await context.params;
  const relation = await prisma.parentStudent.findUnique({
    where: { id },
    select: { id: true, parentId: true, studentId: true, relationship: true },
  });
  if (!relation) return NextResponse.json({ error: "Veli bağlantısı bulunamadı." }, { status: 404 });

  const nextRelationship = parsed.data.relationship?.trim() || null;
  if (relation.relationship === nextRelationship) return NextResponse.json({ ok: true });

  await prisma.$transaction(async (tx) => {
    await tx.parentStudent.update({
      where: { id: relation.id },
      data: { relationship: nextRelationship },
    });
    await tx.parentStudentHistory.create({
      data: {
        parentStudentId: relation.id,
        parentId: relation.parentId,
        studentId: relation.studentId,
        action: "UPDATED",
        relationship: nextRelationship,
        previousValue: relation.relationship,
        actorUserId: auth.session.userId,
      },
    });
    await tx.auditLog.create({
      data: {
        actorUserId: auth.session.userId,
        actorType: "USER",
        entityType: "ParentStudent",
        entityId: relation.id,
        action: "relationship.metadata_updated",
        summary: "Veli–öğrenci yakınlık bilgisi güncellendi",
        payload: {
          parentId: relation.parentId,
          studentId: relation.studentId,
          previousRelationship: relation.relationship,
          relationship: nextRelationship,
        },
      },
    });
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.relationships.delete", requireSameOrigin: true, headers: request.headers, rateLimitKey: `panel:relations:delete:${auth.session.userId}`, rateLimit: { max: 60, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: 403 });
  const { id } = await context.params;
  const relation = await prisma.parentStudent.findUnique({
    where: { id },
    select: { id: true, parentId: true, studentId: true, relationship: true },
  });
  if (!relation) return NextResponse.json({ error: "Veli bağlantısı bulunamadı." }, { status: 404 });

  // Erişim kaldırma ve denetim izi aynı transaction'dadır: biri olmadan diğeri
  // gerçekleşmez. İlişki sonraki her istekte DB'den okunduğu için iptal anlıktır.
  await prisma.$transaction(async (tx) => {
    await tx.parentStudentHistory.create({
      data: {
        parentStudentId: relation.id,
        parentId: relation.parentId,
        studentId: relation.studentId,
        action: "UNLINKED",
        relationship: null,
        previousValue: relation.relationship,
        actorUserId: auth.session.userId,
      },
    });
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
