/**
 * ESKİ tema API'si — M1'de korunarak taşınan ekranlar (`src/features/**`)
 * için. Değerler artık yeni token katmanından (`@/design/tokens`, web
 * `.pn-scope` ile senkron) türetilir; yeni kod doğrudan `@/design` kullanır.
 * (Eski `@/global.css` web-only importu kaldırıldı: TypeScript taban
 * hatasının kaynağıydı ve web hedefi desteklenmiyor.)
 */
import { PRODUCT_THEMES } from '@/design/products';
import { color, space } from '@/design/tokens';

export const Colors = {
  light: {
    text: color.text,
    background: color.canvas,
    backgroundElement: color.surfaceSubtle,
    backgroundSelected: PRODUCT_THEMES.OD.accentSoft,
    textSecondary: color.textSecondary,
  },
} as const;

export const BrandColors = {
  brand: PRODUCT_THEMES.OD.accentMarker,
  brandStrong: PRODUCT_THEMES.OD.accent,
  brandHover: color.primaryPressed,
  brandDeep: '#0C4A38',
  brandSoft: PRODUCT_THEMES.OD.accentSoft,
  brandSoftLine: '#D9EBE3',
  line: color.border,
  lineSoft: '#EDF0EE',
} as const;

export type ThemeColor = keyof typeof Colors.light;

export const Spacing = {
  half: 2,
  one: space[1],
  two: space[2],
  three: space[4],
  four: space[6],
  five: space[8],
  six: 64,
} as const;
