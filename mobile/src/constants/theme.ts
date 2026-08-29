/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

/**
 * Web panelinin `--dc-*` token seti (`app/globals.css`) buraya elle taşındı —
 * ayrı bir mobil palet İCAT EDİLMEDİ (mobil inşa promptu §2.3). Web panelinin
 * kendisi karanlık mod desteklemiyor (`--dc-*` yalnız `:root`'ta tanımlı,
 * `[data-theme="dark"]` bloğu bu token'ları hiç ezmiyor) — bu yüzden `dark`
 * burada da aynı değerleri kullanıyor; icat edilmiş bir karanlık palet değil.
 */
export const Colors = {
  light: {
    text: '#14201C', // --dc-ink
    background: '#FBFCFA', // --dc-canvas
    backgroundElement: '#F4F8F6', // --dc-surface-muted
    backgroundSelected: '#EDF7F2', // --dc-brand-soft
    textSecondary: '#5C6B65', // --dc-ink-muted
  },
  dark: {
    text: '#14201C',
    background: '#FBFCFA',
    backgroundElement: '#F4F8F6',
    backgroundSelected: '#EDF7F2',
    textSecondary: '#5C6B65',
  },
} as const;

export const BrandColors = {
  brand: '#14976B',
  brandStrong: '#0C7C57',
  brandHover: '#0C6B4C',
  brandDeep: '#0C4A38',
  brandSoft: '#EDF7F2',
  brandSoftLine: '#D9EBE3',
  line: '#E7EBE8',
  lineSoft: '#EDF0EE',
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
