import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Banner, Button, PageHeader, Screen, TextField } from '@/design/primitives';
import * as endpoints from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Parola sıfırlama isteği. Sunucu hesabın var olup olmadığını söylemez;
 * aynı genel mesaj gösterilir. Bağlantı e-postadan web'de açılır (uygulama
 * içi sıfırlama derin bağlantısı M8).
 */
export default function ForgotPasswordScreen() {
  const { api } = useSession();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      setMessage(await endpoints.requestPasswordReset(api, email.trim()));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'İstek gönderilemedi.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <PageHeader title="Parolamı unuttum" description="E-posta adresini yaz; hesabın varsa sıfırlama bağlantısı gönderilir." />
      {message ? <Banner tone="success">{message}</Banner> : null}
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <TextField label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="username" returnKeyType="send" onSubmitEditing={submit} />
      <Button label="Bağlantı gönder" onPress={submit} loading={busy} disabled={email.trim().length < 3} />
      <Button label="Girişe dön" variant="quiet" onPress={() => router.back()} />
    </Screen>
  );
}
