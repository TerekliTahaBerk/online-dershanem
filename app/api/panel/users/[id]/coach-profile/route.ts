import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { idParamsSchema } from "@/lib/api/input-validation";

/**
 * Yönetim · koç kapasitesi. Koçluk yetkisinin kendisi `staff-roles` ucundan
 * (COACH@OK) verilir; burası yalnız eşzamanlı koçluk öğrencisi tavanını yazar.
 * `null` = tavan tanımlı değil (kapasite uyarısı üretilmez).
 */
const schema = z.object({ coachCapacity: z.number().int().min(1).max(500).nullable() });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({
    action: "panel.users.coach_profile",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:users:coach-profile:${auth.session.userId}`,
    rateLimit: { max: 60, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const params = idParamsSchema.safeParse(await context.params);
  const body = schema.safeParse(await request.json().catch(() => null));
  if (!params.success || !body.success) return NextResponse.json({ error: "Geçerli bir kapasite girin (1–500) ya da boş bırakın." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: params.data.id }, select: { role: true, teacherProfile: { select: { coachCapacity: true } } } });
  if (!user || user.role !== "TEACHER") return NextResponse.json({ error: "Personel hesabı bulunamadı." }, { status: 404 });

  await prisma.teacherProfile.upsert({
    where: { userId: params.data.id },
    create: { userId: params.data.id, coachCapacity: body.data.coachCapacity },
    update: { coachCapacity: body.data.coachCapacity },
  });
  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: params.data.id,
    action: "coaching.capacity_updated",
    summary: `Koç kapasitesi: ${body.data.coachCapacity ?? "tanımsız"}`,
    payload: { before: user.teacherProfile?.coachCapacity ?? null, after: body.data.coachCapacity },
  });
  return NextResponse.json({ coachCapacity: body.data.coachCapacity });
}
