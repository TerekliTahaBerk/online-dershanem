import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';

import appIcon from '@/assets/images/icon.png';
import { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BrandColors, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { useSession } from '@/lib/auth-context';

export default function SignInScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      // Sunucudaki "hesap yok / parola yanlış" ayrım yapmayan tek mesaj
      // (`GENERIC_ERROR`, `app/api/auth/login/route.ts`) burada da aynen
      // gösterilir — enumeration'a karşı ikinci bir ayrım İCAT EDİLMEZ.
      setError(err instanceof ApiError ? err.message : 'Giriş yapılamadı. Bağlantınızı kontrol edin.');
      if (Platform.OS === 'ios') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
    }
  }

  const canSubmit = email.trim().length > 2 && password.length > 0 && !submitting;

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ThemedView style={styles.container}>
            <Image source={appIcon} style={styles.logo} alt="Online Dershanem" />
            <ThemedText type="title" style={styles.title}>
              Online Dershanem
            </ThemedText>
            <ThemedText type="default" themeColor="textSecondary" style={styles.subtitle}>
              Hesabınız yönetim ekibi tarafından açılmıştır.
            </ThemedText>

            <ThemedView
              type="backgroundElement"
              style={[styles.field, focusedField === 'email' && styles.fieldFocused]}>
              <SymbolView
                name="envelope"
                size={18}
                tintColor={BrandColors.brandStrong}
                fallback={null}
                style={styles.fieldIcon}
              />
              <TextInput
                accessibilityLabel="E-posta"
                placeholder="E-posta"
                placeholderTextColor="#8A9691"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                value={email}
                onChangeText={setEmail}
                style={styles.input}
              />
            </ThemedView>

            <ThemedView
              type="backgroundElement"
              style={[styles.field, focusedField === 'password' && styles.fieldFocused]}>
              <SymbolView
                name="lock"
                size={18}
                tintColor={BrandColors.brandStrong}
                fallback={null}
                style={styles.fieldIcon}
              />
              <TextInput
                ref={passwordRef}
                accessibilityLabel="Şifre"
                placeholder="Şifre"
                placeholderTextColor="#8A9691"
                secureTextEntry={!passwordVisible}
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={handleSubmit}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                value={password}
                onChangeText={setPassword}
                style={[styles.input, styles.inputWithTrailingIcon]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? 'Şifreyi gizle' : 'Şifreyi göster'}
                hitSlop={10}
                style={styles.eyeToggle}
                onPress={() => setPasswordVisible((v) => !v)}>
                <SymbolView
                  name={passwordVisible ? 'eye.slash' : 'eye'}
                  size={18}
                  tintColor="#5C6B65"
                  fallback={
                    <ThemedText type="small" themeColor="textSecondary">
                      {passwordVisible ? 'Gizle' : 'Göster'}
                    </ThemedText>
                  }
                />
              </Pressable>
            </ThemedView>

            {error ? (
              <ThemedView style={styles.errorBanner}>
                <SymbolView name="exclamationmark.triangle.fill" size={15} tintColor="#B3261E" fallback={null} />
                <ThemedText type="small" style={styles.errorText}>
                  {error}
                </ThemedText>
              </ThemedView>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={!canSubmit}
              onPress={handleSubmit}
              style={({ pressed }) => [
                styles.button,
                !canSubmit && styles.buttonDisabled,
                pressed && canSubmit && styles.buttonPressed,
              ]}>
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText type="smallBold" style={styles.buttonLabel}>
                  Giriş Yap
                </ThemedText>
              )}
            </Pressable>
          </ThemedView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  logo: {
    width: 56,
    height: 56,
    alignSelf: 'center',
    marginBottom: Spacing.two,
    borderRadius: Spacing.two,
  },
  title: { fontSize: 26, lineHeight: 32, textAlign: 'center' },
  subtitle: { marginBottom: Spacing.two, textAlign: 'center' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  fieldFocused: { borderColor: BrandColors.brandStrong },
  fieldIcon: { width: 18, height: 18 },
  eyeToggle: { minWidth: 24, minHeight: 24, alignItems: 'center', justifyContent: 'center' },
  input: { flex: 1, height: 50, fontSize: 16 },
  inputWithTrailingIcon: { paddingRight: Spacing.two },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: '#FBEEEC',
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorText: { color: '#B3261E', flex: 1 },
  button: {
    // Web'in butonları da gölgesiz (`--panel-card-shadow: none` aynı dilde) —
    // burada da gölge YOK, yalnız dolgu rengi.
    marginTop: Spacing.two,
    height: 50,
    borderRadius: 10,
    backgroundColor: BrandColors.brandStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { backgroundColor: BrandColors.brandHover },
  buttonDisabled: { opacity: 0.45 },
  buttonLabel: { color: '#ffffff' },
});
