import type { MobileProductCode } from '@contracts/bootstrap';

/**
 * Ürün vurguları (`--pn-accent-{od,yon,dl}`). Vurgu YALNIZ aktif sekme,
 * rozet, küçük işaret, grafik ve seçili satırda kullanılır; zemin ve
 * birincil butonlar ürünle boyanmaz (web kuralı).
 */
export type ProductTheme = {
  code: MobileProductCode | 'NONE';
  accent: string;
  accentSoft: string;
  accentMarker: string;
};

export const PRODUCT_THEMES: Record<MobileProductCode, ProductTheme> = {
  OD: { code: 'OD', accent: '#0c7c57', accentSoft: '#edf7f2', accentMarker: '#14976b' }, // --pn-accent-od*
  OK: { code: 'OK', accent: '#0754c9', accentSoft: '#e8f1fe', accentMarker: '#0673f5' }, // --pn-accent-yon*
  ODK: { code: 'ODK', accent: '#5b2599', accentSoft: '#f1eafa', accentMarker: '#6c35ac' }, // --pn-accent-dl*
};

/** Çalışma alanı seçilmeden (personel / seçim ekranı) nötr tema: OD temeli = web varsayılanı. */
export const NEUTRAL_THEME: ProductTheme = { ...PRODUCT_THEMES.OD, code: 'NONE' };

export function productTheme(code: MobileProductCode | null | undefined): ProductTheme {
  return code ? PRODUCT_THEMES[code] : NEUTRAL_THEME;
}

/** Kullanıcıya görünen ürün adları sunucudan (`products[].label`) gelir; bu yalnız yedek. */
export const PRODUCT_FALLBACK_LABEL: Record<MobileProductCode, string> = {
  OD: 'onlinedershanem.',
  OK: 'Yön Koçluk',
  ODK: 'Deneme Ligi',
};
