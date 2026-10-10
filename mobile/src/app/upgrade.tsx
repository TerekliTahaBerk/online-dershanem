import { Banner, Button, PageHeader, Screen, Text } from '@/design/primitives';
import { APP_VERSION } from '@/config/app-info';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Desteklenmeyen sürüm. Sunucu 426 `CLIENT_UPGRADE_REQUIRED` döndü veya
 * bootstrap'taki minimum sürüm yüklü sürümden yeni. Mağaza bağlantıları
 * uygulama mağazaya çıkınca eklenecek (M9); şimdilik açık talimat.
 */
export default function UpgradeScreen() {
  const { state, refreshBootstrap, signOut } = useSession();
  const minimum = state.status === 'UPGRADE_REQUIRED' ? state.minSupportedVersion : null;
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <PageHeader title="Güncelleme gerekli" />
      <Banner tone="warning">Uygulamanın yeni bir sürümü var! Devam etmek için mağazadan güncellemen yeterli.</Banner>
      <Text tone="secondary">
        Yüklü sürüm: {APP_VERSION ?? 'bilinmiyor'}
        {minimum ? ` · Gereken en düşük sürüm: ${minimum}` : ''}
      </Text>
      <Button label="Tekrar kontrol et" variant="secondary" onPress={() => void refreshBootstrap()} />
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </Screen>
  );
}
