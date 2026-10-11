import { useRouter } from 'expo-router';

import { Banner, Button, PageHeader, Row, Screen, Section, Text } from '@/design/primitives';
import { useReadyBootstrap } from '@/lib/auth/session-provider';

import { ROLE_LABEL } from './labels';
import { openOnWeb } from './web-continuation';

/**
 * Çalışma alanı (etkin panel) olmayan personel için bilgi ana sayfası.
 * Öğretmen (M7) ve yönetim (Faz 1) çalışma alanı seçiliyken kendi native
 * Bugün / Operasyon Merkezi ekranlarını açar; bu ekran yalnız menü boşken.
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
      <Banner tone="info" title="Çalışma alanı bulunamadı">
        {role === 'ADMIN' ? 'Etkin bir panel seçili değil. Menüden bir panel seçince yönetim ekranları açılır.' : 'Hesabına bağlı etkin bir öğretmen çalışma alanı yok. Web panelinden devam edebilirsin.'}
      </Banner>
      <Section title="Şimdilik">
        <Row title="Bildirimler" meta={unread > 0 ? `${unread} okunmamış` : null} onPress={() => router.push('/notifications')} />
        <Row title="Hesap ve ayarlar" onPress={() => router.push('/account')} />
      </Section>
      <Button label="Web panelini aç" variant="secondary" onPress={() => void openOnWeb(home)} accessibilityHint="Tarayıcıda açılır; web oturumuyla giriş yapmanız gerekebilir." />
    </Screen>
  );
}
