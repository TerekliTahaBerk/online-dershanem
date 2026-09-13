import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { guardMutation, mutationGuardResponse } from "@/lib/security/mutation-guard";
import { RATE_LIMIT_POLICIES } from "@/lib/security/rate-limit-policies";
import { getClientIp, getRateLimitKeyFromIp } from "@/lib/security/rate-limit";
import { PUBLIC_REGISTER_ENABLED } from "@/lib/panel-config";
import { isPlausibleEmail, normalizeEmail } from "@/lib/auth/email";
import { validatePasswordStrength } from "@/lib/auth/password-policy";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { PRODUCT_SELECTOR_PATH } from "@/lib/auth/roles";

/**
 * Public kayıt.
 *
 * ÜRÜN KURALI (2026-08-15, kullanıcı onaylı): kayıt bir hesap açar ama
 * HİÇBİR ÜRÜN ERİŞİMİ VERMEZ. `ProductMembership` satırı YAZILMAZ; erişimi
 * ödeme/onay sonrası admin açar. Bu yüzden yeni kullanıcı panelde
 * "aktif ürününüz yok" durumunu görür.
 *
 * Buraya asla `productMembership.create` EKLEME — eklersen ödeme yapmamış
 * herkes panele girer.
 *
 * Rol her zaman STUDENT'tır; istek gövdesinden rol OKUNMAZ (privilege
 * escalation yüzeyi).
 *
 * KULLANICI SAYIMINA (enumeration) KARŞI: e-posta zaten kayıtlıysa yanıt
 * "bu e-posta kayıtlı" DEMEZ; her durumda aynı başarılı gövde döner ve
 * oturum açılmaz. Böylece form, hangi adreslerin sistemde olduğunu
 * sızdırmaz.
 */

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  if (!PUBLIC_REGISTER_ENABLED) {
    return NextResponse.json({ error: "Kayıt şu anda kapalı." }, { status: 503 });
  }

  const ip = getClientIp(request.headers);
  const policy = RATE_LIMIT_POLICIES.register;

  const guard = await guardMutation({
    action: policy.action,
    requireSameOrigin: true,
    headers: { get: (name: string) => request.headers.get(name) },
    rateLimitKey: getRateLimitKeyFromIp(request.headers, policy.action),
    rateLimit: policy.limit,
  });
  if (!guard.ok) {
    return mutationGuardResponse(guard);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bilgiler okunamadı." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ad soyad, e-posta ve parola alanlarını eksiksiz doldurun." },
      { status: 400 },
    );
  }

  const fullName = parsed.data.fullName;
  const email = normalizeEmail(parsed.data.email);
  const { password } = parsed.data;

  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }

  const strength = validatePasswordStrength(password, { email, fullName });
  if (!strength.ok) {
    return NextResponse.json({ error: strength.error }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);

  let created: { id: string } | null = null;
  try {
    created = await prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash,
        role: "STUDENT",
        status: "ACTIVE",
        // Kullanıcı parolayı kendisi belirledi; zorunlu değiştirme yok.
        mustChangePassword: false,
        inviteAcceptedAt: new Date(),
        passwordChangedAt: new Date(),
      },
      select: { id: true },
    });
  } catch (error) {
    // P2002 = unique ihlali (e-posta zaten var). Sayıma karşı sessiz geçilir.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      throw error;
    }
  }

  if (!created) {
    // E-posta zaten kayıtlı. Oturum AÇILMAZ, ama yanıt başarılı kayıttan
    // ayırt edilemez; kullanıcıya giriş ekranına gitmesi söylenir.
    await logAudit({
      actorType: "SYSTEM",
      entityType: "User",
      entityId: email,
      action: "auth.register_duplicate",
      summary: "Var olan e-posta ile kayıt denemesi",
      payload: { ip },
    });
    return NextResponse.json({ redirect: "/giris?kayit=tamam" });
  }

  await logAudit({
    actorUserId: created.id,
    entityType: "User",
    entityId: created.id,
    action: "auth.register",
    summary: "Public kayıt — ürün erişimi verilmedi",
    payload: { ip },
  });

  await createSession(created.id, "STUDENT", {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  // Ürün erişimi olmadığı için ürün seçici "aktif ürün yok" durumunu gösterir.
  return NextResponse.json({ redirect: PRODUCT_SELECTOR_PATH });
}
