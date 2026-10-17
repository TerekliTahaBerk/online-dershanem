import { router, type Href } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { Banner, BottomSheet, Button, Text, TextField } from '@/design/primitives';
import { verifyStepUp } from '@/lib/api/admin';
import { ApiError } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session-provider';

import { openOnWeb } from '../shell/web-continuation';

/**
 * NATIVE STEP-UP (Faz 1). Hassas bir yönetim işlemi 428 `STEP_UP_REQUIRED`
 * aldığında `requestStepUp()` bu sayfayı açar: doğrulayıcı uygulama kodu
 * sunucuda doğrulanır (`purpose: "STEP_UP"`), oturumun `stepUpAt` alanı
 * yenilenir. İstemci step-up'ı "geçildi" diye işaretleyemez; karar her
 * istekte sunucudadır. Sonuç: doğrulandıysa true, vazgeçildiyse false.
 *
 * İlk doğrulayıcı kurulumu native güvenlik ekranındadır (`/account/security`,
 * C09). Geçiş anahtarı native değildir; yalnız passkey'li hesapta güvenlik
 * sayfası web'de açılır.
 */
type StepUpContextValue = { requestStepUp: () => Promise<boolean> };

const StepUpContext = createContext<StepUpContextValue | null>(null);

export function StepUpProvider({ children }: PropsWithChildren) {
  const { api, bootstrap, refreshBootstrap } = useSession();
  const [visible, setVisible] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef<((verified: boolean) => void) | null>(null);
  const security = bootstrap?.workspace?.capabilities.security ?? null;
  const totp = Boolean(security?.mfa.totp);

  const settle = useCallback((verified: boolean) => {
    pending.current?.(verified);
    pending.current = null;
    setVisible(false);
    setCode('');
    setError(null);
  }, []);

  const requestStepUp = useCallback(
    () =>
      new Promise<boolean>((resolve) => {
        // Aynı anda ikinci istek gelirse öncekini iptal eder; tek sayfa açık kalır.
        pending.current?.(false);
        pending.current = resolve;
        setCode('');
        setError(null);
        setVisible(true);
      }),
    [],
  );

  async function verify() {
    setBusy(true);
    setError(null);
    try {
      await verifyStepUp(api, code.trim());
      settle(true);
      // Pencere bitişini (`stepUpExpiresAt`) güncellemek için; sonucu beklenmez.
      void refreshBootstrap().catch(() => undefined);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Kodu doğrulayamadık. Lütfen kontrol edip tekrar dener misin?');
    } finally {
      setBusy(false);
    }
  }

  const value = useMemo(() => ({ requestStepUp }), [requestStepUp]);
  const valid = /^\d{6}$/.test(code.trim());

  return (
    <StepUpContext.Provider value={value}>
      {children}
      <BottomSheet visible={visible} title="Kimliğini doğrula" onClose={() => settle(false)}>
        {totp ? (
          <>
            <Text tone="secondary">Güvenliğin için bu işlemden önce kısa bir doğrulama yapalım 🔐 Doğrulayıcı uygulamandaki 6 haneli kodu girmen yeterli; doğrulama 10 dakika geçerli kalır.</Text>
            {error ? <Banner tone="critical">{error}</Banner> : null}
            <TextField
              label="Doğrulama kodu"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={() => valid && void verify()}
              testID="step-up-code"
            />
            <Button label="Doğrula ve devam et" onPress={verify} loading={busy} disabled={!valid || busy} testID="step-up-submit" />
            <Button label="Vazgeç" variant="quiet" onPress={() => settle(false)} testID="step-up-cancel" />
          </>
        ) : (
          <>
            <Banner tone="warning" title={security?.mfa.passkey ? 'Geçiş anahtarı mobilde henüz desteklenmiyor' : 'İkinci faktör kurulu değil'}>
              {security?.mfa.passkey
                ? 'Hesabın yalnızca geçiş anahtarıyla doğrulanıyor. Güvenlik sayfasından bir doğrulayıcı uygulama eklediğinde bu işlemi mobilde de yapabilirsin.'
                : 'Hassas işlemler için önce bir doğrulayıcı uygulama kurman gerekiyor; birkaç dakikanı alır 😊'}
            </Banner>
            {security?.mfa.passkey ? (
              <Button label="Güvenlik sayfasını aç" variant="secondary" onPress={() => void openOnWeb('/panel/guvenlik')} accessibilityHint="Tarayıcıda açılır; web oturumuyla giriş yapman gerekebilir." />
            ) : (
              <Button label="Doğrulayıcı uygulamayı kur" variant="secondary" onPress={() => { settle(false); router.push('/account/security' as Href); }} testID="step-up-enroll" />
            )}
            <Button label="Kapat" variant="quiet" onPress={() => settle(false)} testID="step-up-cancel" />
          </>
        )}
      </BottomSheet>
    </StepUpContext.Provider>
  );
}

export function useStepUp(): StepUpContextValue {
  const value = useContext(StepUpContext);
  if (!value) throw new Error('useStepUp, StepUpProvider içinde kullanılmalı.');
  return value;
}
