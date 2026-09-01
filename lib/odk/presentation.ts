import type { OdkAttemptStatus, OdkExamStatus, PilotCohortStatus } from "@prisma/client";

export type OdkStatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export const examStatusPresentation: Record<OdkExamStatus, { label: string; tone: OdkStatusTone; productAlias: string }> = {
  DRAFT: { label: "Taslak", tone: "neutral", productAlias: "DRAFT" },
  READY: { label: "Hazır", tone: "info", productAlias: "READY" },
  SCHEDULED: { label: "Planlandı", tone: "info", productAlias: "SCHEDULED" },
  LIVE: { label: "Canlı", tone: "danger", productAlias: "LIVE" },
  ENDED: { label: "Kapandı", tone: "warning", productAlias: "CLOSED" },
  SCORED: { label: "İnceleme", tone: "warning", productAlias: "REVIEW" },
  RELEASED: { label: "Yayınlandı", tone: "success", productAlias: "PUBLISHED" },
  ARCHIVED: { label: "Arşivlendi", tone: "neutral", productAlias: "ARCHIVED" },
};

export const attemptStatusPresentation: Record<OdkAttemptStatus, { label: string; tone: OdkStatusTone }> = {
  IN_PROGRESS: { label: "Çözüyor", tone: "info" },
  SUBMITTED: { label: "Teslim edildi", tone: "success" },
  AUTO_SUBMITTED: { label: "Otomatik teslim", tone: "warning" },
  VOID: { label: "Geçersiz", tone: "neutral" },
  REVIEW_REQUIRED: { label: "İnceleme gerekli", tone: "warning" },
};

export const integrityLevelPresentation: Record<"NORMAL" | "REVIEW" | "HIGH", { label: string; tone: OdkStatusTone }> = {
  NORMAL: { label: "Normal", tone: "success" },
  REVIEW: { label: "İncelenmeli", tone: "warning" },
  HIGH: { label: "Yüksek sinyal", tone: "danger" },
};

export const pilotStatusPresentation: Record<PilotCohortStatus, { label: string; tone: OdkStatusTone }> = {
  DRAFT: { label: "Taslak", tone: "neutral" },
  ACTIVE: { label: "Aktif", tone: "success" },
  PAUSED: { label: "Duraklatıldı", tone: "warning" },
  COMPLETED: { label: "Tamamlandı", tone: "info" },
  ROLLED_BACK: { label: "Geri alındı", tone: "danger" },
};

export const statusToneClasses: Record<OdkStatusTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  info: "bg-[var(--pd-pastel-sky-soft)] text-[var(--pd-pastel-sky-ink)]",
  warning: "bg-[var(--pd-pastel-yellow-soft)] text-[var(--pd-pastel-yellow-ink)]",
  success: "bg-[var(--pd-pastel-mint-soft)] text-[var(--pd-pastel-mint-ink)]",
  danger: "bg-[var(--pd-pastel-blush-soft)] text-[var(--pd-pastel-blush-ink)]",
};
