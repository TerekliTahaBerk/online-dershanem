import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiProductRole } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { updateExamScheduleSchema } from "@/lib/odk/admin-schemas";
import { DEFAULT_EXAM_SECURITY_POLICY, mergeExamSettings, parseExamSecurityPolicy } from "@/lib/odk/exam-security";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiProductRole("ODK", "ADMIN"); if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "odk.exam.update", requireSameOrigin: true, headers: request.headers, rateLimitKey: `odk:exam-update:${auth.session.userId}`, rateLimit: { max: 90, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = updateExamScheduleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Planlama alanlarını kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const current = await prisma.odkExam.findFirst({
    where: { id, status: { in: ["DRAFT", "READY"] } },
    select: { id: true, currentVersionId: true, currentVersion: { select: { id: true, settings: true, autoSubmit: true } } },
  });
  if (!current) return NextResponse.json({ error: "Yalnız taslak veya hazır deneme düzenlenebilir." }, { status: 409 });
  const startsAt = parsed.data.startsAt ? new Date(parsed.data.startsAt) : null;
  const endsAt = parsed.data.endsAt ? new Date(parsed.data.endsAt) : null;

  const existingPolicy = parseExamSecurityPolicy(current.currentVersion?.settings);
  const security = {
    ...DEFAULT_EXAM_SECURITY_POLICY,
    ...existingPolicy,
    ...(parsed.data.security || {}),
    autoSubmit: parsed.data.autoSubmit ?? parsed.data.security?.autoSubmit ?? existingPolicy.autoSubmit,
  };

  const exam = await prisma.$transaction(async (tx) => {
    const updated = await tx.odkExam.update({
      where: { id },
      data: {
        title: parsed.data.title,
        startsAt,
        endsAt,
        lateEntryMinutes: parsed.data.lateEntryMinutes,
        meetRequired: parsed.data.meetRequired,
        meetUrl: parsed.data.meetUrl || null,
        ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
        ...(parsed.data.internalCode !== undefined ? { internalCode: parsed.data.internalCode } : {}),
      },
    });
    if (current.currentVersionId) {
      await tx.odkExamVersion.update({
        where: { id: current.currentVersionId },
        data: {
          autoSubmit: security.autoSubmit,
          settings: mergeExamSettings(current.currentVersion?.settings, security) as Prisma.InputJsonValue,
          extraTimePolicy: security.allowExtraTimeMinutes > 0
            ? ({ allowExtraTimeMinutes: security.allowExtraTimeMinutes } as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    }
    return updated;
  });

  await logAudit({ actorUserId: auth.session.userId, entityType: "OdkExam", entityId: id, action: "odk.exam_updated", summary: "ODK deneme planlama ve güvenlik bilgileri güncellendi" });
  return NextResponse.json({ exam: { id: exam.id } });
}
