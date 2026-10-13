import { useState } from 'react';

import { Banner, Button, TextField } from '@/design/primitives';
import { AuthScreen } from '@/features/auth/auth-screen';
import { TotpEnrollment } from '@/features/auth/totp-enrollment';
import { openOnWeb } from '@/features/shell/web-continuation';
import * as endpoints from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Giriş MFA kapısı (ayrıcalıklı ürün personeli; politika sunucuda:
 * `userRequiresLoginMfa`). İstemci MFA'yı "geçildi" diye işaretleyemez:
 * kod sunucuda doğrulanır, sonra bootstrap yeniden çekilir.
 *
 * Desteklenen: TOTP, kurtarma kodu ve ilk doğrulayıcı (TOTP) kurulumu (C09).
 * Passkey native değildir (platform passkey kabiliyeti ve alan adı ilişkisi
 * dış karar); yalnız passkey'li hesapta açık bir web devam yolu sunulur.
 */
export default function MfaGate() {
  const { state, api, refreshBootstrap, signOut } = useSession();
  const methods = state.status === 'MFA_REQUIRED' ? state.bootstrap.gates.mfa : null;
  const [method, setMethod] = useState<'TOTP' | 'RECOVERY'>('TOTP');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await endpoints.verifyMfaCode(api, code.trim(), method);
      setCode('');
      await refreshBootstrap();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Kod doğrulanamadı.');
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <>
      <Button label="Durumu kontrol et" variant="secondary" onPress={() => void refreshBootstrap()} />
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </>
  );

  if (!methods?.totp && !methods?.passkey) {
    return (
      <AuthScreen title="İkinci faktörü kur" description="Bu hesap için iki adımlı doğrulama zorunlu. Kurulum bu cihazda tamamlanır.">
        <TotpEnrollment variant="auth" onDone={refreshBootstrap} />
        {footer}
      </AuthScreen>
    );
  }

  if (!methods?.totp) {
    return (
      <AuthScreen title="İkinci faktör gerekli">
        <Banner tone="warning" title="Geçiş anahtarı mobilde henüz desteklenmiyor">
          Hesabın yalnız geçiş anahtarı ile doğrulanıyor. Web panelinde doğrulama yap veya bir doğrulayıcı uygulama ekle; ardından burada “Durumu kontrol et”e dokun.
        </Banner>
        <Button variant="auth" label="Web panelinde devam et" onPress={() => void openOnWeb('/giris/mfa')} accessibilityHint="Tarayıcıda açılır; web oturumuyla giriş yapmanız gerekebilir." />
        {footer}
      </AuthScreen>
    );
  }

  const valid = method === 'TOTP' ? /^\d{6}$/.test(code.trim()) : code.trim().length >= 6;
  return (
    <AuthScreen title="İkinci faktör doğrulaması" description={method === 'TOTP' ? 'Doğrulayıcı uygulamadaki 6 haneli kodu gir.' : 'Kayıtlı kurtarma kodlarından birini gir. Her kod yalnız bir kez kullanılabilir.'}>
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <TextField
        variant="auth"
        label={method === 'TOTP' ? 'Doğrulama kodu' : 'Kurtarma kodu'}
        value={code}
        onChangeText={setCode}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={method === 'TOTP' ? 'number-pad' : 'default'}
        textContentType="oneTimeCode"
        autoComplete={method === 'TOTP' ? 'one-time-code' : 'off'}
        maxLength={method === 'TOTP' ? 6 : 32}
        returnKeyType="go"
        onSubmitEditing={() => valid && void verify()}
        testID="mfa-code"
      />
      <Button variant="auth" label="Doğrula" onPress={verify} loading={busy} disabled={!valid || busy} testID="mfa-submit" />
      {methods.recoveryCodes ? (
        <Button
          label={method === 'TOTP' ? 'Kurtarma kodu kullan' : 'Doğrulayıcı kodu kullan'}
          variant="quiet"
          onPress={() => {
            setMethod(method === 'TOTP' ? 'RECOVERY' : 'TOTP');
            setCode('');
            setError(null);
          }}
        />
      ) : null}
      {methods.passkey ? <Button label="Geçiş anahtarıyla web'de doğrula" variant="quiet" onPress={() => void openOnWeb('/giris/mfa')} /> : null}
      {footer}
    </AuthScreen>
  );
}
