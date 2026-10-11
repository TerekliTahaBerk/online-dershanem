import "server-only";

import { prisma } from "@/lib/prisma";
import { productLabel } from "@/lib/auth/roles";
import {
  CLASS_LEVEL_OPTIONS,
  CONTACT_CHANNEL_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  CONTACT_TIME_OPTIONS,
  EXAM_TYPE_OPTIONS,
  HEARD_FROM_OPTIONS,
  PURCHASE_STATUS_OPTIONS,
  optionLabel,
} from "@/lib/account/dictionaries";

/**
 * Kayıt ve iletişim özeti (kayıt formu, iletişim formu, bildirilen çocuklar).
 * Web kartı (`SignupProfileCard`) ve mobil kişi detayı AYNI satırları kullanır.
 * Kaydı olmayan (yönetimin açtığı) hesaplarda null.
 */
const DATE = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Istanbul" });

/**
 * Yönetim · kullanıcı detayı: kayıt formu, iletişim formu (Tally) ve
 * velinin bildirdiği çocuklar. Kaydı olmayan (admin açtığı) hesaplarda basılmaz.
 */
export async function loadSignupProfileSummary(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      registrationSource: true,
      kvkkAcceptedAt: true,
      marketingConsentAt: true,
      contactFormSubmittedAt: true,
      signupProfile: true,
      pendingChildren: { orderBy: { createdAt: "asc" }, select: { id: true, fullName: true, classLevel: true, examType: true, status: true } },
      contactFormSubmissions: { orderBy: { receivedAt: "desc" }, take: 1, select: { receivedAt: true, payload: true } },
    },
  });
  if (!user || (!user.signupProfile && !user.pendingChildren.length && user.registrationSource !== "SELF_SIGNUP")) return null;
  const profile = user.signupProfile;
  const tally = user.contactFormSubmissions[0];
  const tallyFields = tally
    ? ((tally.payload as { data?: { fields?: Array<{ label?: string | null; type?: string; value?: unknown }> } }).data?.fields ?? []).filter(
        (field) => field.type !== "HIDDEN_FIELDS" && field.value !== null && field.value !== undefined && field.value !== "",
      )
    : [];

  const rows: Array<[string, string | null | undefined]> = [
    ["Kayıt kaynağı", user.registrationSource === "SELF_SIGNUP" ? "Kendi kaydı" : user.registrationSource === "PURCHASE" ? "Ödeme sonrası" : "Yönetim daveti"],
    ["İlgilendiği ürünler", profile?.interestedProducts.map(productLabel).join(", ")],
    ["Satın alım durumu", optionLabel(PURCHASE_STATUS_OPTIONS, profile?.purchaseStatus)],
    ["Sipariş referansı", profile?.existingOrderRef],
    ["Ulaşım tercihi", [optionLabel(CONTACT_CHANNEL_OPTIONS, profile?.preferredChannel), optionLabel(CONTACT_TIME_OPTIONS, profile?.preferredContactTime)].filter(Boolean).join(" · ")],
    ["Konum", [profile?.city, profile?.district].filter(Boolean).join(" / ")],
    ["Veli (beyan)", [profile?.guardianName, profile?.guardianPhone, profile?.guardianEmail].filter(Boolean).join(" · ")],
    ["Kaynak", optionLabel(HEARD_FROM_OPTIONS, profile?.heardFrom)],
    ["İletişim durumu", optionLabel(CONTACT_STATUS_OPTIONS, profile?.contactStatus)],
    ["KVKK onayı", user.kvkkAcceptedAt ? DATE.format(user.kvkkAcceptedAt) : "Yok"],
    ["Ticari ileti izni", user.marketingConsentAt ? `Var (${DATE.format(user.marketingConsentAt)})` : "Yok"],
    ["İletişim formu", user.contactFormSubmittedAt ? DATE.format(user.contactFormSubmittedAt) : "Doldurulmadı"],
  ];

  return {
    rows: rows.flatMap(([label, value]) => (value ? [{ label, value }] : [])),
    note: profile?.note ?? null,
    pendingChildren: user.pendingChildren.map((child) => ({
      id: child.id,
      text: `${child.fullName} · ${optionLabel(CLASS_LEVEL_OPTIONS, child.classLevel) ?? "—"} · ${optionLabel(EXAM_TYPE_OPTIONS, child.examType) ?? "—"} · ${child.status === "PENDING" ? "hesap bekliyor" : child.status === "ACCOUNT_CREATED" ? "hesap açıldı" : "iptal"}`,
    })),
    formFields: tallyFields.slice(0, 40).map((field) => ({ label: field.label ?? "Soru", value: Array.isArray(field.value) ? field.value.join(", ") : String(field.value) })),
  };
}

export type SignupProfileSummary = NonNullable<Awaited<ReturnType<typeof loadSignupProfileSummary>>>;
