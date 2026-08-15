import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation } from "@/lib/security/mutation-guard";
import { requireApiRecentAdminStepUp } from "@/lib/auth/api-guards";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";

/**
 * Hesap açma — YALNIZCA admin.
 *
 * Public self-register yoktur. Üretilen geçici parola yanıtla BİR KEZ döner;
 * hiçbir yerde düz saklanmaz. Admin onu ekrandan alıp WhatsApp/telefonla
 * iletir, kullanıcı ilk girişte değiştirmek zorundadır.
 */

const createUserSchema = z.object({
  email: z.string().min(3).max(254),
  fullName: z.string().trim().min(2).max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "TEACHER", "STUDENT", "PARENT"]),
  products: z.array(z.enum(["OD", "OK", "ODK"])).min(1).max(3),
});

export async function POST(request: Request) {
  const auth = await requireApiRecentAdminStepUp();
  if (!auth.ok) return auth.response;

  const guard = await guardMutation({
    action: "panel.users.create",
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: `panel:users:create:${auth.session.userId}`,
    rateLimit: { max: 30, windowMs: 15 * 60 * 1000 },
  });
  if (!guard.ok) {
    return NextResponse.json(
      { error: guard.code === "RATE_LIMIT" ? "Çok fazla işlem. Biraz sonra tekrar deneyin." : guard.message },
      { status: guard.code === "RATE_LIMIT" ? 429 : 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Formu kontrol edin: e-posta ve rol zorunlu." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "E-posta adresi geçerli görünmüyor." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: `Bu e-posta zaten kayıtlı (${existing.role}). Parola vermek için mevcut hesabı sıfırlayın.` },
      { status: 409 },
    );
  }

  const tempPassword = generateTemporaryPassword();
  const products = parsed.data.role === "ADMIN" || parsed.data.role === "TEACHER" ? (["OD", "OK", "ODK"] as const) : [...new Set(parsed.data.products)];
  const user = await prisma.user.create({
    data: {
      email,
      fullName: parsed.data.fullName?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      role: parsed.data.role,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
      createdById: auth.session.userId,
      ...(parsed.data.role === "STUDENT" ? { studentProfile: { create: {} } } : {}),
      ...(parsed.data.role === "TEACHER" ? { teacherProfile: { create: {} } } : {}),
      productMemberships: { create: products.map((product) => ({ product, source: parsed.data.role === "ADMIN" || parsed.data.role === "TEACHER" ? "STAFF" as const : "MANUAL" as const, grantedById: auth.session.userId })) },
    },
    include: { studentProfile: { select: { id: true } } },
  });

  await logAudit({
    actorUserId: auth.session.userId,
    entityType: "User",
    entityId: user.id,
    action: "panel.user_created",
    summary: `${user.email} (${user.role}) hesabı açıldı`,
    payload: { products },
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, studentProfileId: user.studentProfile?.id || null },
    // BİR KEZ döner. Sunucu bunu bir daha üretemez.
    tempPassword,
  });
}
