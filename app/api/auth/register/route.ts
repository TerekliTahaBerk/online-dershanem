import { NextResponse } from "next/server";
import { Prisma, type UserRole } from "@prisma/client";
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
import { CONTACT_FORM_PATH } from "@/lib/auth/roles";
import { firstIssueMessage, registerSchema } from "@/lib/auth/register-schema";
import { KVKK_TEXT_VERSION, examNeedsFieldTrack } from "@/lib/account/dictionaries";
import { notifyActiveAdmins, productInterestFromCodes, recordBusinessLead } from "@/lib/leads/create-lead";

/**
 * Public kayıt — kendi kendine hesap açma (Öğrenci ya da Veli).
 *
 * ÜRÜN KURALI (2026-08-15, kullanıcı onaylı): kayıt bir hesap açar ama
 * HİÇBİR ÜRÜN ERİŞİMİ VERMEZ. `ProductMembership` satırı YAZILMAZ; erişim
 * PayTR ödemesi sonrası provisioning ya da admin eliyle açılır.
 *
 * Buraya asla `productMembership.create` EKLEME — eklersen ödeme yapmamış
 * herkes panele girer.
 *
 * ROL KURALI: rol yalnız STUDENT ya da PARENT olabilir ve şema
 * (`lib/auth/register-schema.ts`) bunu `discriminatedUnion` ile beyaz listeler.
 * ADMIN / TEACHER gibi bir değer 400 döner (privilege escalation yüzeyi yok).
 *
 * VELİ KAYDI: velinin bildirdiği çocuklar için öğrenci hesabı AÇILMAZ; her
 * çocuk `PendingChild` olarak yönetim kuyruğuna düşer ve hesabı admin açar.
 *
 * KULLANICI SAYIMINA (enumeration) KARŞI: e-posta zaten kayıtlıysa yanıt
 * "bu e-posta kayıtlı" DEMEZ; her durumda aynı başarılı gövde döner ve
 * oturum açılmaz. Böylece form, hangi adreslerin sistemde olduğunu
 * sızdırmaz.
 */

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
      { error: firstIssueMessage(parsed.error, "Kayıt bilgileri eksik ya da hatalı. Lütfen alanları kontrol edin.") },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const fullName = data.fullName;
  const email = normalizeEmail(data.email);
  const { password } = data;

  if (!isPlausibleEmail(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi girin." }, { status: 400 });
  }

  const strength = validatePasswordStrength(password, { email, fullName });
  if (!strength.ok) {
    return NextResponse.json({ error: strength.error }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const role: UserRole = data.accountType;

  let created: { id: string } | null = null;
  try {
    created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          fullName,
          phone: data.phone,
          passwordHash,
          role,
          status: "ACTIVE",
          registrationSource: "SELF_SIGNUP",
          // Kullanıcı parolayı kendisi belirledi; zorunlu değiştirme yok.
          mustChangePassword: false,
          inviteAcceptedAt: now,
          passwordChangedAt: now,
          kvkkAcceptedAt: now,
          kvkkVersion: KVKK_TEXT_VERSION,
          termsAcceptedAt: now,
          marketingConsentAt: data.marketingConsent ? now : null,
        },
        select: { id: true },
      });

      await tx.signupProfile.create({
        data: {
          userId: user.id,
          city: data.city,
          district: data.district,
          heardFrom: data.heardFrom ?? null,
          interestedProducts: data.interestedProducts,
          purchaseStatus: data.purchaseStatus,
          existingOrderRef: data.purchaseStatus === "ALREADY_PURCHASED" ? data.existingOrderRef : null,
          preferredChannel: data.preferredChannel,
          preferredContactTime: data.preferredContactTime,
          note: data.note,
          ...(data.accountType === "STUDENT"
            ? { guardianName: data.guardianName, guardianPhone: data.guardianPhone, guardianEmail: data.guardianEmail }
            : { relationship: data.relationship }),
        },
      });

      if (data.accountType === "STUDENT") {
        await tx.studentProfile.create({
          data: {
            userId: user.id,
            classLevel: data.classLevel,
            schoolName: data.schoolName,
            schoolType: data.schoolType ?? null,
            examType: data.examType,
            fieldTrack: examNeedsFieldTrack(data.examType) ? data.fieldTrack ?? null : null,
            targetRank: data.targetRank ?? null,
            birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00Z`) : null,
            weakSubjects: data.weakSubjects,
            weeklyStudyHours: data.weeklyStudyHours ?? null,
          },
        });
      } else {
        await tx.pendingChild.createMany({
          data: data.children.map((child) => ({
            parentUserId: user.id,
            fullName: child.fullName,
            classLevel: child.classLevel,
            schoolName: child.schoolName,
            examType: child.examType,
            fieldTrack: examNeedsFieldTrack(child.examType) ? child.fieldTrack ?? null : null,
            birthYear: child.birthYear ?? null,
            email: child.email,
            phone: child.phone,
            relationship: data.relationship,
          })),
        });
      }

      return user;
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
    summary: `Kendi kaydı (${role === "PARENT" ? "veli" : "öğrenci"}) — ürün erişimi verilmedi`,
    payload: {
      ip,
      role,
      interestedProducts: data.interestedProducts,
      purchaseStatus: data.purchaseStatus,
      ...(data.accountType === "PARENT" ? { childCount: data.children.length } : {}),
    },
  });

  // CRM + yönetim bildirimi en iyi çabadır: başarısızlık kaydı geri almaz.
  try {
    const firstChild = data.accountType === "PARENT" ? data.children[0] : null;
    await recordBusinessLead({
      source: "SELF_SIGNUP",
      fullName,
      phone: data.phone,
      email,
      city: data.city,
      grade: data.accountType === "STUDENT" ? data.classLevel : firstChild?.classLevel ?? null,
      examType: data.accountType === "STUDENT" ? data.examType : firstChild?.examType ?? null,
      studentName: data.accountType === "STUDENT" ? fullName : firstChild?.fullName ?? null,
      parentName: data.accountType === "PARENT" ? fullName : data.guardianName,
      productInterest: productInterestFromCodes(data.interestedProducts),
      tags: [role === "PARENT" ? "veli" : "ogrenci", ...data.interestedProducts.map((code) => code.toLowerCase()), data.purchaseStatus.toLowerCase()],
      consentMetadata: { kvkkVersion: KVKK_TEXT_VERSION, marketingConsent: data.marketingConsent },
      relatedOdUserId: created.id,
    });
    await notifyActiveAdmins({
      title: data.purchaseStatus === "ALREADY_PURCHASED" ? "Yeni kayıt — satın alım yaptığını belirtti" : "Yeni kayıt",
      body: `${fullName} · ${role === "PARENT" ? "Veli" : "Öğrenci"} · ${data.interestedProducts.join(", ")}`,
      href: "/panel/yonetim/basvurular",
    });
  } catch {
    /* bildirim/CRM hatası kaydı engellemez */
  }

  await createSession(created.id, role, {
    ip,
    userAgent: request.headers.get("user-agent"),
  });

  // Hesap açıldı; kullanıcıya ulaşabilmemiz için iletişim formu (Tally). Form
  // atlanabilir; atlanırsa ürün seçiciye geçer.
  return NextResponse.json({ redirect: CONTACT_FORM_PATH });
}
