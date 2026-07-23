import type { OdkAttemptStatus, OdkExamStatus, PilotCohortStatus } from "@prisma/client";

export type OdkStatusTone = "neutral" | "info" | "warning" | "success" | "danger";

export const examStatusPresentation: Record<OdkExamStatus, { label: string; tone: OdkStatusTone }> = {
  DRAFT: { label: "Taslak", tone: "neutral" },
  READY: { label: "Hazır", tone: "info" },
  SCHEDULED: { label: "Planlandı", tone: "info" },
  LIVE: { label: "Canlı", tone: "danger" },
  ENDED: { label: "Sona erdi", tone: "warning" },
  SCORED: { label: "Puanlandı", tone: "warning" },
  RELEASED: { label: "Sonuçlar açık", tone: "success" },
  ARCHIVED: { label: "Arşivlendi", tone: "neutral" },
};

export const attemptStatusPresentation: Record<OdkAttemptStatus, { label: string; tone: OdkStatusTone }> = {
  IN_PROGRESS: { label: "Çözüyor", tone: "info" },
  SUBMITTED: { label: "Teslim edildi", tone: "success" },
  AUTO_SUBMITTED: { label: "Otomatik teslim", tone: "warning" },
  VOID: { label: "Geçersiz", tone: "neutral" },
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
