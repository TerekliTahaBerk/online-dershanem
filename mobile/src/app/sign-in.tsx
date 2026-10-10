import * as Haptics from 'expo-haptics';
import { Link } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, type TextInput } from 'react-native';

import { Banner, Button, Text, TextField } from '@/design/primitives';
import { AuthScreen } from '@/features/auth/auth-screen';
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
    <AuthScreen title="Tekrar hoş geldin">
        {notice === 'SESSION_EXPIRED' ? <Banner tone="warning">Oturumun sona erdi. Lütfen tekrar giriş yap.</Banner> : null}
        {error ? <Banner tone="critical">{error}</Banner> : null}
        <TextField
          variant="auth"
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
          variant="auth"
          label="Şifre"
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
        <Button variant="auth" label="Giriş Yap" onPress={handleSubmit} loading={submitting} disabled={!canSubmit} testID="sign-in-submit" />
        <Link href="/forgot-password" style={styles.link}>
          <Text tone="secondary">Şifremi unuttum</Text>
        </Link>
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: space[3] },
});
