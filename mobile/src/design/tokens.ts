import type { TextStyle } from 'react-native';

/**
 * Mobil tasarım token'ları — TEK KAYNAK web panelinin `.pn-scope` katmanıdır
 * (`app/globals.css`). Her değerin yanındaki CSS değişkeni birebir aynıdır;
 * `scripts/check-mobile-tokens.mjs` CI'da iki tarafı karşılaştırır.
 * Ayrı bir mobil palet İCAT EDİLMEZ. Koyu tema kapsam dışıdır (web ile aynı).
 */

export const color = {
  canvas: '#ffffff', // --pn-canvas
  sidebar: '#f7f8f7', // --pn-sidebar
  surfaceSubtle: '#fafbfa', // --pn-surface-subtle
  pressed: 'rgba(20, 32, 28, 0.045)', // --pn-hover
  selected: 'rgba(20, 32, 28, 0.07)', // --pn-selected
  border: '#e9ecea', // --pn-border
  borderStrong: '#d9dedb', // --pn-border-strong
  text: '#14201C', // --pn-text (= --dc-ink)
  textSecondary: '#4E5C56', // --pn-text-secondary (= --dc-ink-body)
  textMuted: '#5f6e67', // --pn-text-muted
  focus: '#0c7c57', // --pn-focus
  /** Birincil buton dolgusu ürün bağımsızdır (web: "ürün vurgusu butonlarda değil"). */
  primary: '#0C7C57', // --dc-brand-strong
  primaryPressed: '#0C6B4C', // --dc-brand-hover
  onPrimary: '#ffffff',
} as const;

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'critical';

/** Semantik durum tonları — üründen BAĞIMSIZ (`lib/panel/status-vocabulary.ts` tonları). */
export const tone: Record<Tone, { text: string; soft: string }> = {
  neutral: { text: '#4e5c56', soft: '#f1f3f2' }, // --pn-tone-neutral(-soft)
  info: { text: '#1e4e8c', soft: '#eaf2fb' }, // --pn-tone-info(-soft)
  success: { text: '#1f6b45', soft: '#e8f4ec' }, // --pn-tone-success(-soft)
  warning: { text: '#7a5a0b', soft: '#fdf5dc' }, // --pn-tone-warning(-soft)
  critical: { text: '#9a2b1f', soft: '#fbeae6' }, // --pn-tone-critical(-soft)
};

/** Yüksek kontrast haritası (`html[data-panel-contrast="high"]`). */
export const highContrast = {
  text: '#000000',
  textSecondary: '#171717',
  textMuted: '#303030',
  border: '#505050',
  borderStrong: '#303030',
} as const;

export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
} as const;

/** Tipografi ölçeği — docs/panel-design-roadmap.md §5.3 (mobil değerler). */
export const type = {
  pageTitle: { fontFamily: font.bold, fontSize: 20, lineHeight: 28, letterSpacing: -0.3 },
  sectionTitle: { fontFamily: font.semibold, fontSize: 15, lineHeight: 22, letterSpacing: -0.075 },
  subsection: { fontFamily: font.semibold, fontSize: 13.5, lineHeight: 20 },
  label: { fontFamily: font.medium, fontSize: 12.5, lineHeight: 18 },
  body: { fontFamily: font.regular, fontSize: 14, lineHeight: 22 },
  bodyStrong: { fontFamily: font.semibold, fontSize: 14, lineHeight: 22 },
  secondary: { fontFamily: font.regular, fontSize: 13, lineHeight: 20 },
  meta: { fontFamily: font.medium, fontSize: 12, lineHeight: 16 },
  caption: { fontFamily: font.semibold, fontSize: 11.5, lineHeight: 16, letterSpacing: 0.12 },
  numeric: { fontFamily: font.semibold, fontSize: 15, lineHeight: 20, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;

/** 4px taban; mobil sayfa kenarı 16, bölümler arası 32 (roadmap §5.4). */
export const space = { 0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40 } as const;

export const radius = { control: 6, card: 10, pill: 999 } as const;

/** Dokunma hedefi alt sınırı (WCAG / platform yönergeleri). */
export const touchTarget = 44;

/** Satır yüksekliği: öğrenci/veli "comfortable" 48; personel 44 (dokunma alt sınırı). */
export const rowHeight = { comfortable: 48, standard: 44 } as const;
