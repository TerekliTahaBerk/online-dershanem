export const extraTimeOptions = [0, 25, 50, 100] as const;
export type ExtraTimePercent = (typeof extraTimeOptions)[number];

export type AccessibilityViewPreference = {
  reducedMotion: boolean;
  highContrast: boolean;
  textScale: "DEFAULT" | "LARGE";
  comfortableSpacing: boolean;
  captionsPreferred: boolean;
  transcriptPreferred: boolean;
};

export const defaultAccessibilityViewPreference: AccessibilityViewPreference = {
  reducedMotion: false,
  highContrast: false,
  textScale: "DEFAULT",
  comfortableSpacing: false,
  captionsPreferred: false,
  transcriptPreferred: false,
};

export function activeViewPreferenceCount(preference: AccessibilityViewPreference): number {
  return Number(preference.reducedMotion) + Number(preference.highContrast) + Number(preference.textScale === "LARGE") + Number(preference.comfortableSpacing) + Number(preference.captionsPreferred) + Number(preference.transcriptPreferred);
}

export function academicSupportLabels(input: { assessmentExtraPercent: number; breaksAllowed: boolean; captionsPreferred: boolean; transcriptPreferred: boolean }): string[] {
  return [
    input.assessmentExtraPercent > 0 ? `Değerlendirmede %${input.assessmentExtraPercent} ek süre` : null,
    input.breaksAllowed ? "Planlı kısa mola" : null,
    input.captionsPreferred ? "Altyazılı medya" : null,
    input.transcriptPreferred ? "Metin dökümü" : null,
  ].filter((item): item is string => Boolean(item));
}
