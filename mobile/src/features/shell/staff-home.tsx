import { useRouter } from 'expo-router';

import { Banner, Button, PageHeader, Row, Screen, Section, Text } from '@/design/primitives';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { PHASE_COPY } from '@/navigation/native-screens';

import { ROLE_LABEL } from './labels';
import { openOnWeb } from './web-continuation';

/**
 * Yönetim (ADMIN, yalnız web) ve çalışma alanı olmayan öğretmen için bilgi
 * ana sayfası (M7'den beri öğretmen çalışma alanı native Bugün'ü açar).
 * Sahte iş verisi göstermez; rolün mobilde neyin geleceğini ve web devam
 * yolunu açıkça söyler. Personel yetenekleri sunucudan gelir (bootstrap).
 */
export function StaffHomeScreen() {
  const bootstrap = useReadyBootstrap();
  const router = useRouter();
  const role = bootstrap.user.role;
  const firstName = bootstrap.user.fullName?.split(' ')[0];
  const home = bootstrap.workspace?.navigation.primary[0]?.webPath ?? '/panel';
  const unread = bootstrap.workspace?.unreadNotifications ?? 0;
  return (
    <Screen testID={`staff-home-${role}`}>
      <PageHeader title={firstName ? `Merhaba ${firstName}` : 'Merhaba'} context={<Text tone="muted" variant="meta">{ROLE_LABEL[role]}</Text>} />
      <Banner tone="info" title={role === 'ADMIN' ? 'Yönetim web panelinde' : 'Çalışma alanı bulunamadı'}>
        {role === 'ADMIN' ? PHASE_COPY.WEB : 'Hesabınıza bağlı etkin bir öğretmen çalışma alanı görünmüyor. Web panelinden devam edebilirsiniz.'}
      </Banner>
      <Section title="Şimdilik">
        <Row title="Bildirimler" meta={unread > 0 ? `${unread} okunmamış` : null} onPress={() => router.push('/notifications')} />
        <Row title="Hesap ve ayarlar" onPress={() => router.push('/account')} />
      </Section>
      <Button label="Web panelini aç" variant="secondary" onPress={() => void openOnWeb(home)} accessibilityHint="Tarayıcıda açılır; web oturumuyla giriş yapmanız gerekebilir." />
    </Screen>
  );
}
