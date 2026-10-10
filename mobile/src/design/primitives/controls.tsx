import { Eye, EyeOff } from 'lucide-react-native';
import { forwardRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useDesign } from '../theme';
import { auth, color, font, radius, space, tone as toneColor, touchTarget, type Tone } from '../tokens';
import { Text } from './text';

type ButtonVariant = 'primary' | 'auth' | 'secondary' | 'quiet' | 'destructive';

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

/** 44pt minimum dokunma hedefi; birincil dolgu ürün bağımsız web paneliyle aynı koyu nötr renktir. */
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
      style={({ pressed }) => [styles.button, buttonStyle[variant], pressed && pressedStyle[variant], variant === 'auth' && styles.authButton, inactive && styles.inactive]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'auth' ? color.onPrimary : color.text} />
      ) : (
        <View style={styles.buttonInner}>
          {leading}
          <Text variant="bodyStrong" style={[{ color: labelColor[variant] }, variant === 'auth' && styles.authButtonLabel]}>
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
  variant?: 'panel' | 'auth';
};

/** Etiketli alan (web `.pn-field`): etiket görünür, hata alanla ilişkili okunur. */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField({ label, error, hint, secureToggle = false, secureTextEntry, variant = 'panel', ...rest }, ref) {
  const { product } = useDesign();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hidden = secureToggle ? !revealed : secureTextEntry;
  return (
    <View style={styles.field}>
      {variant !== 'auth' ? <Text variant="label" tone="secondary" nativeID={`${label}-label`}>
        {label}
      </Text> : null}
      <View style={[styles.inputWrap, variant === 'auth' && styles.authInputWrap, focused && { borderColor: product.accent }, error ? { borderColor: toneColor.critical.text } : null]}>
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          accessibilityLabelledBy={variant === 'panel' ? `${label}-label` : undefined}
          placeholder={variant === 'auth' ? label : undefined}
          accessibilityHint={error ?? hint}
          placeholderTextColor={color.textMuted}
          secureTextEntry={Boolean(hidden)}
          onFocus={(event) => {
            setFocused(true);
            rest.onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            rest.onBlur?.(event);
          }}
          style={[styles.input, variant === 'auth' && styles.authInput]}
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
            {revealed ? <EyeOff size={18} color={color.textSecondary} /> : <Eye size={18} color={color.textSecondary} />}
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

/**
 * Sekme / bölümlü seçim (web `ViewTabs`). Ekran okuyucuda sekme listesi
 * olarak okunur; seçili sekme ürün vurgusuyla işaretlenir. Sayı varsa
 * etiketin parçası olarak okunur.
 */
export function SegmentedTabs<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (value: T) => void; label: string }) {
  const { product } = useDesign();
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.tabs}>
      {options.map((option) => {
        const selected = option.value === value;
        const text = option.count === undefined ? option.label : `${option.label} (${option.count})`;
        return (
          <Pressable
            key={option.value}
            testID={`tab-${option.value}`}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={text}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.tab, selected && { backgroundColor: color.canvas, borderColor: color.border }, pressed && !selected && { backgroundColor: color.pressed }]}>
            <Text variant={selected ? 'bodyStrong' : 'secondary'} style={selected ? { color: product.accent } : undefined}>
              {text}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const buttonStyle = StyleSheet.create({
  primary: { backgroundColor: color.text },
  auth: { backgroundColor: color.primary },
  secondary: { backgroundColor: color.canvas, borderWidth: 1, borderColor: color.borderStrong },
  quiet: { backgroundColor: 'transparent' },
  destructive: { backgroundColor: color.canvas, borderWidth: 1, borderColor: toneColor.critical.text },
});
const pressedStyle = StyleSheet.create({
  primary: { backgroundColor: '#000000' },
  auth: { backgroundColor: color.primaryPressed },
  secondary: { backgroundColor: color.pressed },
  quiet: { backgroundColor: color.pressed },
  destructive: { opacity: 0.85 },
});
const labelColor: Record<ButtonVariant, string> = { primary: color.onPrimary, auth: color.onPrimary, secondary: color.text, quiet: color.text, destructive: toneColor.critical.text };

const styles = StyleSheet.create({
  button: { minHeight: touchTarget, borderRadius: radius.control, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[4], paddingVertical: space[2] },
  authButton: { minHeight: auth.controlHeight, borderRadius: auth.radius },
  authButtonLabel: { fontFamily: font.bold, fontSize: 15.5 },
  authInputWrap: { minHeight: auth.controlHeight, borderRadius: auth.radius, borderColor: auth.border },
  authInput: { minHeight: auth.controlHeight, paddingHorizontal: 14 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2], flexWrap: 'wrap' },
  inactive: { opacity: 0.45 },
  field: { gap: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', minHeight: touchTarget, borderWidth: 1, borderColor: color.borderStrong, borderRadius: radius.control, backgroundColor: color.canvas },
  input: { flex: 1, minHeight: touchTarget, paddingHorizontal: space[3], fontFamily: font.regular, fontSize: 15, color: color.text },
  reveal: { minHeight: touchTarget, minWidth: touchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2] },
  badge: { alignSelf: 'flex-start', borderRadius: radius.control, paddingHorizontal: 8, paddingVertical: 3 },
  productMark: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  tabs: { flexDirection: 'row', gap: 2, padding: 2, borderRadius: radius.card, backgroundColor: color.sidebar, borderWidth: 1, borderColor: color.border },
  tab: { flex: 1, minHeight: touchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space[2], paddingVertical: space[2], borderRadius: radius.control, borderWidth: 1, borderColor: 'transparent' },
});
