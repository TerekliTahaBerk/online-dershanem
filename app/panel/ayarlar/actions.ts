"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth/guards";
import { guardMutation } from "@/lib/security/mutation-guard";
import { logAudit } from "@/lib/audit";
import { KVKK_TEXT_VERSION, examNeedsFieldTrack } from "@/lib/account/dictionaries";
import { firstIssueMessage } from "@/lib/auth/register-schema";
import { notifyActiveAdmins } from "@/lib/leads/create-lead";
import {
  addChildSchema,
  billingSettingsSchema,
  consentSettingsSchema,
  contactSettingsSchema,
  educationSettingsSchema,
  formDataObject,
  profileSettingsSchema,
  type SettingsActionState,
} from "@/lib/account/settings-schema";

/**
 * PANEL · HESAP AYARLARI — server action'lar.
 *
 * GÜVENLİK:
 *  - Her action kendi oturumunu `requireActiveUser` ile alır ve YALNIZ kendi
 *    kaydını yazar; formdan hiçbir kullanıcı kimliği okunmaz.
 *  - `guardMutation` same-origin + hız limiti uygular ve yönetici
 *    önizlemesinde (View As) yazmayı engeller.
 *  - Bu ayarlar hiçbir ürün erişimi açmaz; yalnız iletişim ve profil verisidir.
 */

async function guard(action: string, userId: string): Promise<string | null> {
  const result = await guardMutation({
    action,
    userId,
    requireSameOrigin: true,
    rateLimitKey: `account:settings:${userId}`,
    rateLimit: { max: 60, windowMs: 15 * 60_000 },
  });
  return result.ok ? null : result.message;
}

function saved(message: string): SettingsActionState {
  revalidatePath("/panel/ayarlar", "layout");
  return { ok: true, message, savedAt: Date.now() };
}

function failed(message: string): SettingsActionState {
  return { ok: false, message };
}

function signupProfileUpsert(userId: string, data: Prisma.SignupProfileUncheckedUpdateInput) {
  return prisma.signupProfile.upsert({
    where: { userId },
    update: data,
    create: { ...(data as Prisma.SignupProfileUncheckedCreateInput), userId },
  });
}

export async function saveProfileSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const session = await requireActiveUser();
  const blocked = await guard("account.settings.profile", session.userId);
  if (blocked) return failed(blocked);

  const parsed = profileSettingsSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return failed(firstIssueMessage(parsed.error));
  const data = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: session.userId }, data: { fullName: data.fullName, phone: data.phone } });
    if (session.role === "STUDENT" || session.role === "PARENT") {
      const profile = {
        city: data.city ?? null,
        district: data.district ?? null,
        ...(session.role === "PARENT" ? { relationship: data.relationship ?? null } : {}),
      };
      await tx.signupProfile.upsert({ where: { userId: session.userId }, update: profile, create: { ...profile, userId: session.userId } });
    }
    if (session.role === "STUDENT") {
      const birthDate = data.birthDate ? new Date(`${data.birthDate}T00:00:00Z`) : null;
      await tx.studentProfile.upsert({ where: { userId: session.userId }, update: { birthDate }, create: { userId: session.userId, birthDate } });
    }
  });

  await logAudit({ actorUserId: session.userId, entityType: "User", entityId: session.userId, action: "account.settings.profile", summary: "Profil bilgileri güncellendi" });
  return saved("Profil bilgilerin kaydedildi.");
}

export async function saveEducationSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const session = await requireActiveUser();
  if (session.role !== "STUDENT") return failed("Bu bölüm yalnız öğrenci hesapları içindir.");
  const blocked = await guard("account.settings.education", session.userId);
  if (blocked) return failed(blocked);

  const parsed = educationSettingsSchema.safeParse(formDataObject(formData, ["weakSubjects"]));
  if (!parsed.success) return failed(firstIssueMessage(parsed.error));
  const data = parsed.data;

  const education = {
    classLevel: data.classLevel,
    examType: data.examType,
    fieldTrack: examNeedsFieldTrack(data.examType) ? data.fieldTrack ?? null : null,
    schoolName: data.schoolName ?? null,
    schoolType: data.schoolType ?? null,
    targetRank: data.targetRank ?? null,
    weeklyStudyHours: data.weeklyStudyHours ?? null,
    weakSubjects: data.weakSubjects,
  };
  await prisma.$transaction([
    prisma.studentProfile.upsert({ where: { userId: session.userId }, update: education, create: { ...education, userId: session.userId } }),
    signupProfileUpsert(session.userId, {
      guardianName: data.guardianName ?? null,
      guardianPhone: data.guardianPhone ?? null,
      guardianEmail: data.guardianEmail ?? null,
    }),
  ]);

  await logAudit({ actorUserId: session.userId, entityType: "StudentProfile", entityId: session.userId, action: "account.settings.education", summary: "Eğitim bilgileri güncellendi" });
  return saved("Eğitim bilgilerin kaydedildi.");
}

export async function saveContactSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const session = await requireActiveUser();
  const blocked = await guard("account.settings.contact", session.userId);
  if (blocked) return failed(blocked);

  const parsed = contactSettingsSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return failed(firstIssueMessage(parsed.error));

  await signupProfileUpsert(session.userId, {
    preferredChannel: parsed.data.preferredChannel,
    preferredContactTime: parsed.data.preferredContactTime,
    note: parsed.data.note ?? null,
  });
  await logAudit({ actorUserId: session.userId, entityType: "SignupProfile", entityId: session.userId, action: "account.settings.contact", summary: "İletişim tercihleri güncellendi" });
  return saved("İletişim tercihlerin kaydedildi.");
}

export async function saveBillingSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const session = await requireActiveUser();
  const blocked = await guard("account.settings.billing", session.userId);
  if (blocked) return failed(blocked);

  const parsed = billingSettingsSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return failed(firstIssueMessage(parsed.error));

  await signupProfileUpsert(session.userId, { billingAddress: parsed.data.billingAddress ?? null });
  await logAudit({ actorUserId: session.userId, entityType: "SignupProfile", entityId: session.userId, action: "account.settings.billing", summary: "Fatura adresi güncellendi" });
  return saved("Fatura bilgilerin kaydedildi.");
}

export async function saveConsentSettings(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const session = await requireActiveUser();
  const blocked = await guard("account.settings.consents", session.userId);
  if (blocked) return failed(blocked);

  const parsed = consentSettingsSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return failed("Onaylar okunamadı.");

  const current = await prisma.user.findUniqueOrThrow({ where: { id: session.userId }, select: { kvkkAcceptedAt: true, marketingConsentAt: true } });
  const now = new Date();
  const data: Prisma.UserUpdateInput = {};
  // KVKK onayı tek yönlüdür: geri çekme talebi hesap silme/veri talebi
  // sürecidir ve buradan yapılmaz (bkz. /kvkk başvuru kanalı).
  if (parsed.data.kvkkConsent && !current.kvkkAcceptedAt) Object.assign(data, { kvkkAcceptedAt: now, kvkkVersion: KVKK_TEXT_VERSION, termsAcceptedAt: now });
  if (parsed.data.marketingConsent && !current.marketingConsentAt) data.marketingConsentAt = now;
  if (!parsed.data.marketingConsent && current.marketingConsentAt) data.marketingConsentAt = null;

  if (Object.keys(data).length) {
    await prisma.user.update({ where: { id: session.userId }, data });
    await logAudit({
      actorUserId: session.userId,
      entityType: "User",
      entityId: session.userId,
      action: "account.settings.consents",
      summary: "Onay tercihleri güncellendi",
      payload: { marketingConsent: parsed.data.marketingConsent, kvkkAccepted: Boolean(current.kvkkAcceptedAt || parsed.data.kvkkConsent) },
    });
  }
  return saved("Onay tercihlerin kaydedildi.");
}

export async function addPendingChild(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const session = await requireActiveUser();
  if (session.role !== "PARENT") return failed("Bu bölüm yalnız veli hesapları içindir.");
  const blocked = await guard("account.settings.add_child", session.userId);
  if (blocked) return failed(blocked);

  const parsed = addChildSchema.safeParse(formDataObject(formData));
  if (!parsed.success) return failed(firstIssueMessage(parsed.error, "Çocuğun ad soyad, sınıf ve hedef sınav bilgisi zorunlu."));
  const child = parsed.data;

  const pendingCount = await prisma.pendingChild.count({ where: { parentUserId: session.userId, status: "PENDING" } });
  if (pendingCount >= 5) return failed("Aynı anda en fazla 5 bekleyen çocuk kaydı açılabilir. Ekibimiz sizi arayacak.");

  const relationship = await prisma.signupProfile.findUnique({ where: { userId: session.userId }, select: { relationship: true } });
  const created = await prisma.pendingChild.create({
    data: {
      parentUserId: session.userId,
      fullName: child.fullName,
      classLevel: child.classLevel,
      schoolName: child.schoolName,
      examType: child.examType,
      fieldTrack: examNeedsFieldTrack(child.examType) ? child.fieldTrack ?? null : null,
      birthYear: child.birthYear ?? null,
      email: child.email,
      phone: child.phone,
      relationship: relationship?.relationship ?? null,
    },
    select: { id: true },
  });
  await logAudit({ actorUserId: session.userId, entityType: "PendingChild", entityId: created.id, action: "account.settings.add_child", summary: "Veli yeni çocuk bilgisi ekledi" });
  await notifyActiveAdmins({ title: "Veli yeni çocuk ekledi", body: `${session.fullName || session.email} · ${child.fullName}`, href: "/panel/yonetim/basvurular?sekme=cocuklar" }).catch(() => undefined);
  return saved(`${child.fullName} eklendi. Öğrenci hesabını ekibimiz açıp hesabınıza bağlayacak.`);
}

export async function cancelPendingChild(_state: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const session = await requireActiveUser();
  if (session.role !== "PARENT") return failed("Bu bölüm yalnız veli hesapları içindir.");
  const blocked = await guard("account.settings.cancel_child", session.userId);
  if (blocked) return failed(blocked);

  const parsed = z.object({ childId: z.string().min(1).max(64) }).safeParse(formDataObject(formData));
  if (!parsed.success) return failed("Kayıt bulunamadı.");

  // Ödemesi alınmış çocuk kaydı veliden iptal edilemez: yönetim hesabı
  // açmakla yükümlü, kaydın kaybolması siparişi sahipsiz bırakırdı.
  const result = await prisma.pendingChild.updateMany({
    where: {
      id: parsed.data.childId,
      parentUserId: session.userId,
      status: "PENDING",
      odOrders: { none: { status: "PAID" } },
      odkOrders: { none: { status: "PAID" } },
    },
    data: { status: "CANCELLED", resolvedAt: new Date() },
  });
  if (result.count === 0) return failed("Bu kayıt kaldırılamaz. Ödemesi alınmış bir kayıt için bizimle iletişime geçin.");
  await logAudit({ actorUserId: session.userId, entityType: "PendingChild", entityId: parsed.data.childId, action: "account.settings.cancel_child", summary: "Veli bekleyen çocuk kaydını kaldırdı" });
  return saved("Kayıt kaldırıldı.");
}
