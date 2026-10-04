import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiActorSession } from "@/lib/auth/api-guards";
import { CONTACT_STATUSES } from "@/lib/account/dictionaries";

/**
 * YÖNETİM · YENİ KAYIT İLETİŞİM DURUMU.
 *
 * Arandı / Ulaşılamadı / Müşteri oldu / İlgilenmiyor ve kısa not. Yalnız
 * iletişim takibidir; hiçbir ürün erişimi açmaz ya da kapatmaz.
 */
const bodySchema = z.object({
  contactStatus: z.enum(CONTACT_STATUSES),
  contactNote: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const auth = await requireApiActorSession("ADMIN");
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.signups.contact",
    requireSameOrigin: true,
    headers: request.headers,
    rateLimitKey: `panel:signups:contact:${auth.session.userId}`,
    rateLimit: { max: 120, windowMs: 15 * 60_000 },
  });
  if (!guard.ok) return NextResponse.json({ error: guard.message }, { status: guard.code === "RATE_LIMIT" ? 429 : 403 });

  const { userId } = await params;
  const target = z.string().min(1).max(64).safeParse(userId);
  if (!target.success) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz durum." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: target.data }, select: { id: true, role: true } });
  if (!user || (user.role !== "STUDENT" && user.role !== "PARENT")) return NextResponse.json({ error: "Kayıt bulunamadı." }, { status: 404 });

  const now = new Date();
  const data = {
    contactStatus: parsed.data.contactStatus,
    contactNote: parsed.data.contactNote || null,
    contactedAt: parsed.data.contactStatus === "NEW" ? null : now,
    contactedById: parsed.data.contactStatus === "NEW" ? null : auth.session.userId,
  };
  await prisma.signupProfile.upsert({ where: { userId: user.id }, update: data, create: { userId: user.id, ...data } });
  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "SignupProfile",
    entityId: user.id,
    action: "panel.signups.contact_updated",
    summary: `Kayıt iletişim durumu: ${parsed.data.contactStatus}`,
    payload: { contactStatus: parsed.data.contactStatus },
  });
  return NextResponse.json({ ok: true });
}
