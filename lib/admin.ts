import { IntakeStatus, PurchaseStatus, StudentStatus } from "@prisma/client";

export const intakeStatusLabels: Record<IntakeStatus, string> = {
  NEW: "Yeni",
  REVIEWING: "İnceleniyor",
  CONTACTED: "İletişime Geçildi",
  ENROLLED: "Kayıt Oldu",
  ARCHIVED: "Arşiv"
};

export const purchaseStatusLabels: Record<PurchaseStatus, string> = {
  PENDING: "Bekliyor",
  PAID: "Ödendi",
  FAILED: "Başarısız"
};

export const studentStatusLabels: Record<StudentStatus, string> = {
  NEW: "Yeni",
  FOLLOW_UP: "Takipte",
  ACTIVE: "Aktif",
  AT_RISK: "Riskli",
  COMPLETED: "Tamamlandı",
  INACTIVE: "Pasif"
};

export const intakeStatusOptions = Object.keys(intakeStatusLabels) as IntakeStatus[];
export const studentStatusOptions = Object.keys(studentStatusLabels) as StudentStatus[];
export const purchaseStatusOptions = Object.keys(purchaseStatusLabels) as PurchaseStatus[];

export function formatDateTime(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(value);
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function buildWhatsAppLink(phone: string) {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  const withCountryCode = normalized.startsWith("90")
    ? normalized
    : normalized.startsWith("0")
      ? `90${normalized.slice(1)}`
      : `90${normalized}`;

  return `https://wa.me/${withCountryCode}`;
}
