import { useState } from 'react';
import { Linking } from 'react-native';

import { Banner, Button, PageHeader, Screen, Text } from '@/design/primitives';
import { APP_VERSION, STORE_URLS } from '@/config/app-info';
import { useSession } from '@/lib/auth/session-provider';

/**
 * Desteklenmeyen sürüm. Sunucu 426 `CLIENT_UPGRADE_REQUIRED` döndü veya
 * bootstrap'taki minimum sürüm yüklü sürümden yeni. Mağaza sayfası
 * biliniyorsa doğrudan açılır (native mağaza → web yedeği).
 */
export default function UpgradeScreen() {
  const { state, refreshBootstrap, signOut } = useSession();
  const minimum = state.status === 'UPGRADE_REQUIRED' ? state.minSupportedVersion : null;
  const [storeError, setStoreError] = useState(false);
  async function openStore() {
    if (!STORE_URLS) return;
    setStoreError(false);
    try {
      await Linking.openURL(STORE_URLS.primary);
    } catch {
      try {
        await Linking.openURL(STORE_URLS.fallback);
      } catch {
        setStoreError(true);
      }
    }
  }
  return (
    <Screen edges={['top', 'left', 'right', 'bottom']}>
      <PageHeader title="Güncelleme gerekli" />
      <Banner tone="warning">Uygulamanın bu sürümü artık desteklenmiyor. Devam etmek için uygulamayı mağazadan güncelle.</Banner>
      <Text tone="secondary">
        Yüklü sürüm: {APP_VERSION ?? 'bilinmiyor'}
        {minimum ? ` · Gereken en düşük sürüm: ${minimum}` : ''}
      </Text>
      {STORE_URLS ? <Button label="Mağazada güncelle" onPress={() => void openStore()} testID="upgrade-store" /> : null}
      {storeError ? <Text tone="secondary">Mağaza açılamadı. Uygulama mağazasında “Online Dershanem” araması yapabilirsin.</Text> : null}
      <Button label="Tekrar kontrol et" variant="secondary" onPress={() => void refreshBootstrap()} />
      <Button label="Çıkış yap" variant="quiet" onPress={() => void signOut()} />
    </Screen>
  );
}
