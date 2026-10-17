import { useState } from 'react';

import { Banner, Button, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { TotpEnrollment } from '@/features/auth/totp-enrollment';
import { openOnWeb } from '@/features/shell/web-continuation';
import { confirmAction } from '@/features/staff/shared';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';
import { formatShortDateTime } from '@/lib/format/istanbul';

/**
 * C09 · İki adımlı doğrulama (web `/panel/guvenlik` + MFA ayarları). Yalnız
 * ADMIN ve MFA zorunlu personelde (`capabilities.security`). Doğrulayıcı
 * (TOTP) native kurulur / değiştirilir; geçiş anahtarı yönetimi platform
 * passkey kararı verilene kadar web'dedir. Adım yükseltme (step-up) native
 * TOTP sayfasıyla hassas işlem anında istenir.
 */
export default function AccountSecurityScreen() {
  const bootstrap = useReadyBootstrap();
  const { refreshBootstrap } = useSession();
  const security = bootstrap.workspace?.capabilities.security ?? null;
  const [replacing, setReplacing] = useState(false);
  const [done, setDone] = useState(false);
  if (!security) {
    return (
      <Screen testID="account-security">
        <PageHeader title="İki adımlı doğrulama" />
        <Text tone="secondary">Bu hesap için iki adımlı doğrulama gerekmiyor.</Text>
      </Screen>
    );
  }
  const { mfa } = security;
  async function startReplace() {
    const ok = await confirmAction({ title: 'Doğrulayıcıyı değiştir', message: 'Kurulum tamamlanınca eski doğrulayıcı kodları ve tüm kurtarma kodları geçersiz olur.', confirmLabel: 'Devam et', destructive: true });
    if (ok) setReplacing(true);
  }
  return (
    <Screen testID="account-security">
      <PageHeader title="İki adımlı doğrulama" description="Hassas işlemler ikinci bir doğrulama adımıyla korunur 🔐" />
      {done ? <Banner tone="success">Doğrulayıcı uygulaman kaydedildi, hesabın artık daha güvende 🔐</Banner> : null}
      <Section first title="Durum">
        <Row title="Doğrulayıcı uygulama" trailing={<StatusBadge label={mfa.totp ? 'Kurulu' : 'Kurulu değil'} tone={mfa.totp ? 'success' : 'warning'} />} />
        <Row title="Kurtarma kodları" trailing={<StatusBadge label={mfa.recoveryCodes ? 'Var' : 'Yok'} tone={mfa.recoveryCodes ? 'success' : 'warning'} />} />
        <Row title="Geçiş anahtarı" trailing={<StatusBadge label={mfa.passkey ? 'Kayıtlı' : 'Yok'} tone="neutral" />} />
        <Row title="Adım yükseltme" subtitle={security.stepUpExpiresAt ? `${formatShortDateTime(security.stepUpExpiresAt)} tarihine kadar geçerli` : 'Hassas işlemlerde yeniden doğrulama istenir'} />
      </Section>
      <Section title="Doğrulayıcı uygulama">
        {replacing || !mfa.totp ? (
          <TotpEnrollment
            replacing={mfa.totp}
            onDone={async () => {
              setReplacing(false);
              setDone(true);
              await refreshBootstrap();
            }}
          />
        ) : (
          <Button mutation label="Doğrulayıcıyı değiştir" variant="secondary" onPress={() => void startReplace()} testID="security-replace-totp" />
        )}
      </Section>
      <Section title="Geçiş anahtarları">
        <Text tone="secondary">Geçiş anahtarı ekleme ve kaldırma işlemleri şimdilik web panelinden yapılabiliyor.</Text>
        <Button label="Web'de yönet" variant="quiet" onPress={() => void openOnWeb('/panel/guvenlik')} />
      </Section>
    </Screen>
  );
}
