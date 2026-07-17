import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRole } from "@/lib/auth/api-guards";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email";
import { revokeAllUserSessions } from "@/lib/auth/session";

const schema = z.object({
  email: z.string().min(3).max(254), fullName: z.string().trim().max(120).optional(), phone: z.string().trim().max(32).optional(),
  classLevel: z.string().trim().max(40).optional(), schoolName: z.string().trim().max(160).optional(), targetGoal: z.string().trim().max(500).optional(),
  subjects: z.array(z.string().trim().min(1).max(80)).max(20).optional(), bio: z.string().trim().max(1200).optional(),
});

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiRole("ADMIN");
  if (!auth.ok) return auth.response;
  const guard = await guardMutation({ action: "panel.users.update", requireSameOrigin: true, headers: { get: (name: string) => request.headers.get(name) }, rateLimitKey: `panel:users:update:${auth.session.userId}`, rateLimit: { max: 90, windowMs: 15 * 60 * 1000 } });
  if (!guard.ok) return NextResponse.json({ error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Profil alanlarını kontrol edin." }, { status: 400 });
  const { id } = await context.params;
  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!target) return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
  const email = normalizeEmail(parsed.data.email);
  if (!isPlausibleEmail(email)) return NextResponse.json({ error: "E-posta adresi geçerli görünmüyor." }, { status: 400 });
  if (await prisma.user.findFirst({ where: { email, id: { not: id } }, select: { id: true } })) return NextResponse.json({ error: "Bu e-posta başka bir hesapta kullanılıyor." }, { status: 409 });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { email, fullName: parsed.data.fullName || null, phone: parsed.data.phone || null } });
    if (target.role === "STUDENT") await tx.studentProfile.upsert({ where: { userId: id }, create: { userId: id, classLevel: parsed.data.classLevel || null, schoolName: parsed.data.schoolName || null, targetGoal: parsed.data.targetGoal || null }, update: { classLevel: parsed.data.classLevel || null, schoolName: parsed.data.schoolName || null, targetGoal: parsed.data.targetGoal || null } });
    if (target.role === "TEACHER") await tx.teacherProfile.upsert({ where: { userId: id }, create: { userId: id, subjects: parsed.data.subjects || [], bio: parsed.data.bio || null }, update: { subjects: parsed.data.subjects || [], bio: parsed.data.bio || null } });
  });
  const emailChanged = target.email !== email;
  if (emailChanged) await revokeAllUserSessions(id);
  await logAudit({ actorUserId: auth.session.userId, entityType: "User", entityId: id, action: "panel.user_updated", summary: `${email} profili güncellendi${emailChanged ? "; açık oturumları kapatıldı" : ""}` });
  return NextResponse.json({ ok: true });
}
