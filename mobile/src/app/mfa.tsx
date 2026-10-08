import { useState } from 'react';

import { Banner, Button, PageHeader, Screen, TextField } from '@/design/primitives';
import { openOnWeb } from '@/features/shell/web-continuation';
import * as endpoints from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Giriş MFA kapısı (ayrıcalıklı ürün personeli; politika sunucuda:
 * `userRequiresLoginMfa`). İstemci MFA'yı "geçildi" diye işaretleyemez:
 * kod sunucuda doğrulanır, sonra bootstrap yeniden çekilir.
 *
 * Desteklenen: TOTP ve kurtarma kodu. Passkey ve ilk MFA kurulumu native
 * değildir; bu durumda açık bir web devam yolu ve "kontrol et" sunulur.
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

  if (!methods?.totp) {
    const passkeyOnly = Boolean(methods?.passkey);
    return (
      <Screen edges={['top', 'left', 'right', 'bottom']}>
        <PageHeader title="İkinci faktör gerekli" />
        <Banner tone="warning" title={passkeyOnly ? 'Geçiş anahtarı mobilde henüz desteklenmiyor' : 'İkinci faktör kurulumu gerekiyor'}>
          {passkeyOnly
            ? 'Hesabın yalnız geçiş anahtarı ile doğrulanıyor. Web panelinde doğrulama yap veya bir doğrulayıcı uygulama ekle; ardından burada "Durumu kontrol et"e dokun.'
            : 'Bu hesap için ikinci faktör kurulumu web panelinden yapılır. Kurulumu tamamladıktan sonra burada doğrulama kodunu girebilirsin.'}
        </Banner>
        <Button label="Web panelinde devam et" onPress={() => void openOnWeb('/giris/mfa')} accessibilityHint="Tarayıcıda açılır; web oturumuyla giriş yapmanız gerekebilir." />
        {footer}
      </Screen>
    );
  }

  const valid = method === 'TOTP' ? /^\d{6}$/.test(code.trim()) : code.trim().length >= 6;
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <PageHeader title="İkinci faktör doğrulaması" description={method === 'TOTP' ? 'Doğrulayıcı uygulamadaki 6 haneli kodu gir.' : 'Kayıtlı kurtarma kodlarından birini gir. Her kod yalnız bir kez kullanılabilir.'} />
      {error ? <Banner tone="critical">{error}</Banner> : null}
      <TextField
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
      <Button label="Doğrula" onPress={verify} loading={busy} disabled={!valid || busy} testID="mfa-submit" />
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
    </Screen>
  );
}
