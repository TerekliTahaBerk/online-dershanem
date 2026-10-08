import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View, type TextInput } from 'react-native';

import appIcon from '@/assets/images/icon.png';
import { Banner, Button, Screen, Text, TextField } from '@/design/primitives';
import { space } from '@/design/tokens';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Giriş. Başarılı yanıttan sonra yönlendirme İSTEMCİDE yapılmaz: token
 * saklanır, bootstrap çekilir ve kök navigatör sunucunun döndürdüğü kapıya
 * (parola / MFA / çalışma alanı) gider. Sunucunun "hesap yok / parola
 * yanlış" ayrımı yapmayan mesajı aynen gösterilir.
 */
export default function SignInScreen() {
  const { signIn, state } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const passwordRef = useRef<TextInput>(null);
  const notice = state.status === 'UNAUTHENTICATED' ? state.notice : null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Giriş yapılamadı. Bağlantınızı kontrol edin.');
      if (Platform.OS === 'ios') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSubmitting(false);
      setPassword('');
    }
  }

  const canSubmit = email.trim().length > 2 && password.length > 0 && !submitting;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen edges={['top', 'left', 'right', 'bottom']} contentStyle={styles.content}>
        <View style={styles.brand}>
          <Image source={appIcon} style={styles.logo} accessibilityIgnoresInvertColors alt="" />
          <Text variant="pageTitle" accessibilityRole="header">
            onlinedershanem.
          </Text>
          <Text tone="secondary" style={styles.center}>
            Hesabınla giriş yap.
          </Text>
        </View>
        {notice === 'SESSION_EXPIRED' ? <Banner tone="warning">Oturumun sona erdi. Lütfen tekrar giriş yap.</Banner> : null}
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <TextField
          label="E-posta"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          keyboardType="email-address"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          testID="sign-in-email"
        />
        <TextField
          ref={passwordRef}
          label="Parola"
          value={password}
          onChangeText={setPassword}
          secureToggle
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          testID="sign-in-password"
        />
        <Button label="Giriş yap" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} testID="sign-in-submit" />
        <Link href="/forgot-password" style={styles.link}>
          <Text tone="accent">Parolamı unuttum</Text>
        </Link>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', gap: space[4] },
  brand: { alignItems: 'center', gap: space[2], marginBottom: space[2] },
  logo: { width: 56, height: 56, borderRadius: 12 },
  center: { textAlign: 'center' },
  link: { alignSelf: 'center', paddingVertical: space[3] },
});
