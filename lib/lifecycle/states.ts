/**
 * Lead → Student lifecycle — kavramsal durum haritası.
 *
 * Yeni Prisma enum üretilmez. Mevcut `LeadStage`, `OdkOrderStatus`,
 * `OdProvisioningStatus` / `OdkProvisioningStatus` ve `OdOnboardingState`
 * alanları kaynak kabul edilir; bu modül yalnız okunabilir etiket/view
 * kodları üretir.
 */

import type {
  LeadStage,
  OdOnboardingState,
  OdProvisioningStatus,
  OdkOrderStatus,
  OdkProvisioningStatus,
} from "@prisma/client";

/** Ürün dilindeki Lead durumları (CRM `LeadStage` üzerine). */
export const LIFECYCLE_LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "OFFERED",
  "WON",
  "LOST",
] as const;
export type LifecycleLeadStage = (typeof LIFECYCLE_LEAD_STAGES)[number];

/** Ürün dilindeki Sale/Order durumları (`OdkOrderStatus` üzerine). */
export const LIFECYCLE_ORDER_STATUSES = [
  "CREATED",
  "PAYMENT_PENDING",
  "PAID",
  "CANCELLED",
  "REFUNDED",
] as const;
export type LifecycleOrderStatus = (typeof LIFECYCLE_ORDER_STATUSES)[number];

/** Ürün dilindeki Provisioning durumları. */
export const LIFECYCLE_PROVISIONING_STATUSES = [
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "NEEDS_REVIEW",
] as const;
export type LifecycleProvisioningStatus = (typeof LIFECYCLE_PROVISIONING_STATUSES)[number];

/** Ürün dilindeki öğrenci onboarding durumları (türetilmiş). */
export const LIFECYCLE_STUDENT_STATUSES = [
  "ACCOUNT_CREATED",
  "INVITED",
  "INVITE_ACCEPTED",
  "PACKAGE_ACTIVE",
  "GROUP_PENDING",
  "READY",
] as const;
export type LifecycleStudentStatus = (typeof LIFECYCLE_STUDENT_STATUSES)[number];

const LEAD_STAGE_TO_LIFECYCLE: Record<LeadStage, LifecycleLeadStage> = {
  NEW: "NEW",
  CONTACTED: "CONTACTED",
  QUALIFIED: "QUALIFIED",
  MEETING_PLANNED: "QUALIFIED",
  TRIAL_PLANNED: "QUALIFIED",
  OFFER_SENT: "OFFERED",
  PAYMENT_PENDING: "OFFERED",
  WON: "WON",
  LOST: "LOST",
  SPAM: "LOST",
};

export function toLifecycleLeadStage(stage: LeadStage): LifecycleLeadStage {
  return LEAD_STAGE_TO_LIFECYCLE[stage];
}

export function toLifecycleOrderStatus(status: OdkOrderStatus): LifecycleOrderStatus {
  switch (status) {
    case "PENDING":
      return "PAYMENT_PENDING";
    case "PAID":
      return "PAID";
    case "CANCELLED":
      return "CANCELLED";
    case "REFUNDED":
      return "REFUNDED";
    default:
      return "CREATED";
  }
}

export function toLifecycleProvisioningStatus(
  status: OdProvisioningStatus | OdkProvisioningStatus,
): LifecycleProvisioningStatus {
  switch (status) {
    case "PENDING":
      return "PENDING";
    case "RUNNING":
      return "RUNNING";
    case "SUCCEEDED":
      return "COMPLETED";
    case "RETRY_PENDING":
      return "FAILED";
    case "MANUAL_REVIEW":
      return "NEEDS_REVIEW";
    default:
      return "PENDING";
  }
}

export type StudentReadinessSignals = {
  hasAccount: boolean;
  inviteSentAt: Date | null;
  inviteAcceptedAt: Date | null;
  packageActive: boolean;
  hasGroup: boolean;
  onboardingState?: OdOnboardingState | null;
};

/**
 * Öğrenci hazırlık durumu — DB'de ayrı enum yok; hesap/davet/paket/grup
 * sinyallerinden türetilir. `OdOnboardingState.ACTIVE` varsa READY.
 */
export function deriveLifecycleStudentStatus(input: StudentReadinessSignals): LifecycleStudentStatus {
  if (input.onboardingState === "ACTIVE" || (input.hasGroup && input.packageActive && input.inviteAcceptedAt)) {
    return "READY";
  }
  if (input.hasAccount && input.packageActive && !input.hasGroup) return "GROUP_PENDING";
  if (input.hasAccount && input.packageActive) return "PACKAGE_ACTIVE";
  if (input.hasAccount && input.inviteAcceptedAt) return "INVITE_ACCEPTED";
  if (input.hasAccount && input.inviteSentAt) return "INVITED";
  if (input.hasAccount) return "ACCOUNT_CREATED";
  return "ACCOUNT_CREATED";
}

export const LIFECYCLE_LEAD_LABELS: Record<LifecycleLeadStage, string> = {
  NEW: "Yeni",
  CONTACTED: "Görüşüldü",
  QUALIFIED: "Nitelikli",
  OFFERED: "Teklif verildi",
  WON: "Kazanıldı",
  LOST: "Kaybedildi",
};

export const LIFECYCLE_ORDER_LABELS: Record<LifecycleOrderStatus, string> = {
  CREATED: "Oluşturuldu",
  PAYMENT_PENDING: "Ödeme bekliyor",
  PAID: "Ödendi",
  CANCELLED: "İptal",
  REFUNDED: "İade",
};

export const LIFECYCLE_PROVISIONING_LABELS: Record<LifecycleProvisioningStatus, string> = {
  PENDING: "Bekliyor",
  RUNNING: "Çalışıyor",
  COMPLETED: "Tamamlandı",
  FAILED: "Başarısız · yeniden denenecek",
  NEEDS_REVIEW: "Manuel inceleme",
};

export const LIFECYCLE_STUDENT_LABELS: Record<LifecycleStudentStatus, string> = {
  ACCOUNT_CREATED: "Hesap oluşturuldu",
  INVITED: "Davet gönderildi",
  INVITE_ACCEPTED: "Davet kabul edildi",
  PACKAGE_ACTIVE: "Paket aktif",
  GROUP_PENDING: "Grup ataması bekliyor",
  READY: "Hizmete hazır",
};

/** Provisioning hata kodları → operatör dili. */
export const PROVISIONING_ERROR_GUIDANCE: Record<string, string> = {
  STUDENT_EMAIL_MISSING: "Öğrenci e-postası eksik veya geçersiz. Sipariş alıcı bilgisini düzeltip yeniden deneyin.",
  STUDENT_EMAIL_CONFLICT: "E-posta başka bir rol veya askıdaki hesaba bağlı. Mevcut hesabı elle bağlayın veya çakışmayı çözün.",
  STUDENT_IDENTITY_AMBIGUOUS: "TC kimlik birden fazla hesaba işaret ediyor. Manuel eşleştirme gerekli.",
  STUDENT_IDENTITY_CONFLICT: "TC kimlik uygun olmayan bir hesaba bağlı.",
  STUDENT_IDENTITY_MISMATCH: "E-posta ve kimlik sinyalleri farklı hesapları gösteriyor.",
  FORCED_STUDENT_CONFLICT: "Seçilen öğrenci hesabı kullanılamıyor.",
  PARENT_EMAIL_CONFLICT: "Veli e-postası çakışıyor.",
  PARENT_PHONE_AMBIGUOUS: "Veli telefonu birden fazla hesaba bağlı.",
  PARENT_IDENTITY_MISMATCH: "Veli e-posta/telefon farklı hesapları gösteriyor.",
  PARENT_EMAIL_MISSING: "Yeni veli için e-posta gerekli.",
  PARENT_SUSPENDED: "Veli hesabı askıda.",
  IDENTITY_ROLE_CONFLICT: "E-posta öğrenci olmayan bir hesaba bağlı.",
  ORDER_NOT_PAID: "Sipariş ödenmemiş veya iptal/iade edilmiş; provisioning çalışmaz.",
  ORDER_NOT_FOUND: "Sipariş bulunamadı.",
  PAYMENT_INCONSISTENCY: "Ödeme kaydı ile sipariş durumu uyuşmuyor.",
  PACKAGE_PROBLEM: "Paket veya sözleşme bilgisi geçersiz.",
  LINE_OWNER_EMAIL_MISSING: "Satır öğrenci e-postası eksik.",
  LINE_OWNER_CONFLICT: "Satır sahibi e-posta çakışması.",
  ODK_LINE_PRODUCT_MISSING: "ODK satırında ürün kimliği eksik.",
  ODK_LINE_CONTRACT_INVALID: "ODK satır sözleşmesi geçersiz.",
  PROVISIONING_BUSY: "Başka bir provisioning çalışıyor; kısa süre sonra yeniden deneyin.",
  INJECTED_FAILURE: "Test enjeksiyonu (yalnız geliştirme).",
};

export function provisioningErrorGuidance(codeOrMessage: string | null | undefined): string {
  if (!codeOrMessage) return "Provisioning hatası. Sipariş detayından inceleyin veya yeniden deneyin.";
  const known = PROVISIONING_ERROR_GUIDANCE[codeOrMessage];
  if (known) return known;
  for (const [code, guidance] of Object.entries(PROVISIONING_ERROR_GUIDANCE)) {
    if (codeOrMessage.includes(code)) return guidance;
  }
  return codeOrMessage.slice(0, 280);
}
