import { IntakeStatus, LessonStatus, PurchaseStatus, StudentStatus, TeacherStatus } from "@prisma/client";

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

export function formatDateTimeLocalInput(date?: Date | string | null) {
  if (!date) return "";

  const value = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "";

  const offset = value.getTimezoneOffset();
  const localDate = new Date(value.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeOptional(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export const lessonStatusLabels: Record<LessonStatus, string> = {
  SCHEDULED: "Planlandı",
  COMPLETED: "Tamamlandı",
  CANCELLED: "İptal"
};

export const teacherStatusLabels: Record<TeacherStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Pasif"
};

export const lessonStatusOptions = Object.keys(lessonStatusLabels) as LessonStatus[];
export const teacherStatusOptions = Object.keys(teacherStatusLabels) as TeacherStatus[];

export function formatPrice(kurus: number): string {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 0 }).format(kurus / 100);
}

export function formatDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
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

/** Days remaining until expiresAt, floored to 0. Negative means already expired. */
export function calcDaysLeft(expiresAt: Date, now = new Date()): number {
  return Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000);
}
