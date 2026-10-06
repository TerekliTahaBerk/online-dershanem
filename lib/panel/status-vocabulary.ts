import type {
  OdkExamStatus,
  OdkOrderStatus,
  UserStatus,
  WeeklyPlanSuggestionKind,
} from "@prisma/client";
import { examStatusPresentation } from "@/lib/odk/presentation";

/**
 * PANEL DURUM SÖZLÜĞÜ — tek kaynak.
 *
 * Arayüzde ham enum değeri (`ACTIVE`, `PAID`, `SCORED`, `ADAPTIVE_NEXT_WEEK`…)
 * gösterilmez. Aynı kavram her ekranda aynı etiket ve tonla görünür. Yeni bir
 * durum ekranı eklerken önce burada karşılığı tanımlanır.
 *
 * Tonlar semantiktir ve ürün renginden bağımsızdır.
 */

export type StatusTone = "neutral" | "info" | "success" | "warning" | "critical";

export type StatusPresentation = { label: string; tone: StatusTone };

export const USER_STATUS_PRESENTATION: Record<UserStatus, StatusPresentation> = {
  ACTIVE: { label: "Aktif", tone: "success" },
  SUSPENDED: { label: "Askıda", tone: "warning" },
  ARCHIVED: { label: "Arşivlendi", tone: "neutral" },
};

export const ORDER_PAYMENT_STATUS_PRESENTATION: Record<OdkOrderStatus, StatusPresentation> = {
  PAID: { label: "Ödendi", tone: "success" },
  PENDING: { label: "Ödeme bekliyor", tone: "warning" },
  CANCELLED: { label: "İptal", tone: "neutral" },
  REFUNDED: { label: "İade edildi", tone: "neutral" },
};

export const WEEKLY_PLAN_SUGGESTION_KIND_LABELS: Record<WeeklyPlanSuggestionKind, string> = {
  ADAPTIVE_NEXT_WEEK: "Gelecek hafta önerisi",
  REVIEW_QUEUE: "Tekrar kuyruğundan",
  MOCK_EXAM_FOLLOWUP: "Deneme sonrası",
  CARRY_OVER: "Önceki haftadan devreden",
  TEMPLATE: "Şablondan",
};

/** Operasyon hazırlık satırı (`/panel/yonetim/isler`). */
export const READINESS_STATUS_PRESENTATION: Record<"GO" | "GAP", StatusPresentation> = {
  GO: { label: "Hazır", tone: "success" },
  GAP: { label: "Eksik var", tone: "warning" },
};

/** Personel görünümü için Deneme Ligi sınav durumu etiketi. */
export function odkExamStatusLabel(status: OdkExamStatus): string {
  return examStatusPresentation[status].label;
}
