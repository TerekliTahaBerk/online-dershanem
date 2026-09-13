/**
 * Sınav güvenlik / integrity policy — version.settings içinde saklanır.
 * Client-side engeller güvenlik garantisi değildir; UI’da abartılı iddia kurulmaz.
 */

export type ExamSecurityPolicy = {
  fullscreenMode: "OFF" | "SUGGESTED" | "REQUIRED";
  blockCopyPaste: boolean;
  logCopyPaste: boolean;
  trackVisibility: boolean;
  allowExtraTimeMinutes: number;
  autoSubmit: boolean;
};

export const DEFAULT_EXAM_SECURITY_POLICY: ExamSecurityPolicy = {
  fullscreenMode: "SUGGESTED",
  blockCopyPaste: true,
  logCopyPaste: true,
  trackVisibility: true,
  allowExtraTimeMinutes: 0,
  autoSubmit: true,
};

export function parseExamSecurityPolicy(raw: unknown): ExamSecurityPolicy {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const security = source.security && typeof source.security === "object"
    ? (source.security as Record<string, unknown>)
    : source;
  const fullscreen = security.fullscreenMode;
  return {
    fullscreenMode: fullscreen === "OFF" || fullscreen === "REQUIRED" || fullscreen === "SUGGESTED"
      ? fullscreen
      : DEFAULT_EXAM_SECURITY_POLICY.fullscreenMode,
    blockCopyPaste: security.blockCopyPaste !== false,
    logCopyPaste: security.logCopyPaste !== false,
    trackVisibility: security.trackVisibility !== false,
    allowExtraTimeMinutes: Number.isFinite(Number(security.allowExtraTimeMinutes))
      ? Math.max(0, Math.min(60, Math.floor(Number(security.allowExtraTimeMinutes))))
      : 0,
    autoSubmit: security.autoSubmit !== false,
  };
}

export function mergeExamSettings(existing: unknown, security: ExamSecurityPolicy): Record<string, unknown> {
  const base = existing && typeof existing === "object" ? { ...(existing as Record<string, unknown>) } : {};
  return { ...base, security };
}

/** Admin / öğrenci preview metinleri — güvenlik garantisi iddiası yok. */
export function securityPolicySummary(policy: ExamSecurityPolicy): string[] {
  const lines: string[] = [];
  if (policy.fullscreenMode === "REQUIRED") lines.push("Tam ekran istenebilir (tarayıcı kısıtı olabilir).");
  else if (policy.fullscreenMode === "SUGGESTED") lines.push("Tam ekran önerilir; zorunlu güvenlik garantisi değildir.");
  if (policy.blockCopyPaste) lines.push("Soru alanında kopyala/yapıştır sınırlanabilir; denemeler loglanır.");
  if (policy.trackVisibility) lines.push("Sekme görünürlüğü ve odak sinyalleri kaydedilir.");
  if (policy.autoSubmit) lines.push("Süre bitince kayıtlı cevaplarla otomatik teslim.");
  if (policy.allowExtraTimeMinutes > 0) lines.push(`Ek süre politikası: +${policy.allowExtraTimeMinutes} dk.`);
  return lines;
}
