import { forwardRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useDesign } from '../theme';
import { color, font, radius, space, tone as toneColor, touchTarget, type Tone } from '../tokens';
import { Text } from './text';

type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
  testID?: string;
  leading?: ReactNode;
};

/** 44pt minimum dokunma hedefi; birincil dolgu ürün bağımsız marka yeşilidir. */
export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false, accessibilityHint, testID, leading }: ButtonProps) {
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.button, buttonStyle[variant], pressed && pressedStyle[variant], inactive && styles.inactive]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'destructive' ? color.onPrimary : color.text} />
      ) : (
        <View style={styles.buttonInner}>
          {leading}
          <Text variant="bodyStrong" style={{ color: labelColor[variant] }}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string | null;
  hint?: string;
  secureToggle?: boolean;
};

/** Etiketli alan (web `.pn-field`): etiket görünür, hata alanla ilişkili okunur. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, error, hint, secureToggle = false, secureTextEntry, ...rest }, ref) {
  const { product } = useDesign();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hidden = secureToggle ? !revealed : secureTextEntry;
  return (
    <View style={styles.field}>
      <Text variant="label" tone="secondary" nativeID={`${label}-label`}>
        {label}
      </Text>
      <View style={[styles.inputWrap, focused && { borderColor: product.accent }, error ? { borderColor: toneColor.critical.text } : null]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={`${label}-label`}
          accessibilityHint={error ?? hint}
          placeholderTextColor={color.textMuted}
          secureTextEntry={hidden}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          style={styles.input}
          maxFontSizeMultiplier={2}
          {...rest}
        />
        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? `${label} gizle` : `${label} göster`}
            hitSlop={10}
            onPress={() => setRevealed((value) => !value)}
            style={styles.reveal}>
            <Text variant="meta" tone="secondary">
              {revealed ? 'Gizle' : 'Göster'}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="meta" style={{ color: toneColor.critical.text }} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

/** Durum rozeti: ton semantiktir, etiket sunucudan gelir. */
export function StatusBadge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <View style={[styles.badge, { backgroundColor: toneColor[tone].soft }]}>
      <Text variant="caption" style={{ color: toneColor[tone].text }}>
        {label}
      </Text>
    </View>
  );
}

/** Ürün işareti: çalışma alanı adı + vurgu noktası. */
export function ProductMark({ label }: { label: string }) {
  const { product } = useDesign();
  return (
    <View style={[styles.badge, styles.productMark, { backgroundColor: product.accentSoft }]}>
      <View style={[styles.dot, { backgroundColor: product.accentMarker }]} />
      <Text variant="caption" style={{ color: product.accent }}>
        {label}
      </Text>
    </View>
  );
}

const buttonStyle = StyleSheet.create({
  primary: { backgroundColor: color.primary },
  secondary: { backgroundColor: color.canvas, borderWidth: 1, borderColor: color.borderStrong },
  quiet: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: toneColor.critical.text },
});
const pressedStyle = StyleSheet.create({
  primary: { backgroundColor: color.primaryPressed },
  secondary: { backgroundColor: color.pressed },
  quiet: { backgroundColor: color.pressed },
  destructive: { opacity: 0.85 },
});
const labelColor: Record<ButtonVariant, string> = { primary: color.onPrimary, secondary: color.text, quiet: color.text, destructive: color.onPrimary };

const styles = StyleSheet.create({
  button: { minHeight: touchTarget, borderRadius: radius.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4] },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  inactive: { opacity: 0.45 },
  field: { gap: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', minHeight: touchTarget, borderWidth: 1, borderColor: color.borderStrong, borderRadius: radius.control, backgroundColor: color.canvas },
  input: { flex: 1, minHeight: touchTarget, paddingHorizontal: space[3], fontFamily: font.regular, fontSize: 15, color: color.text },
  reveal: { minHeight: touchTarget, minWidth: touchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2] },
  badge: { alignSelf: 'flex-start', borderRadius: radius.control, paddingHorizontal: 8, paddingVertical: 3 },
  productMark: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
