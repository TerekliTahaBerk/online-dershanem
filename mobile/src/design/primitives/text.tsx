import { Text as RNText, useWindowDimensions, type TextProps as RNTextProps } from 'react-native';

import { color, type as typeScale } from '../tokens';

export type TextVariant = keyof typeof typeScale;
export type TextTone = 'default' | 'secondary' | 'muted' | 'inverse' | 'accent';

export type TextProps = RNTextProps & { variant?: TextVariant; tone?: TextTone; accentColor?: string };

const TONE_COLOR: Record<Exclude<TextTone, 'accent'>, string> = {
  default: color.text,
  secondary: color.textSecondary,
  muted: color.textMuted,
  inverse: color.onPrimary,
};

/**
 * Tüm metinler bu bileşenden geçer: Manrope ölçeği + dinamik yazı boyutu.
 * Çok büyük ölçeklerde yerleşim kırılmasın diye üst çarpan 2 ile sınırlı.
 */
export function Text({ variant = 'body', tone = 'default', accentColor, style, maxFontSizeMultiplier = 2, ...rest }: TextProps) {
  const { fontScale } = useWindowDimensions();
  return (
    <RNText
      // Re-measure native text when iOS changes Dynamic Type while the app is open.
      key={fontScale}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[typeScale[variant], { color: tone === 'accent' ? (accentColor ?? color.focus) : TONE_COLOR[tone] }, style]}
      {...rest}
    />
  );
}
