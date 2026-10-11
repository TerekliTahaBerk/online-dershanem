import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/design/primitives';
import { color, space } from '@/design/tokens';
import { useReadyBootstrap, useSession } from '@/lib/auth/session-provider';

/** Outside the navigator: visible on every detail screen, including no-product states. */
export function AdminOverlayBanner() {
  const bootstrap = useReadyBootstrap();
  const { exitAdminOverlay } = useSession();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (!bootstrap.adminOverlay) return null;
  const title = bootstrap.adminOverlay.mode === 'PREVIEW'
    ? `Önizleme: ${bootstrap.user.fullName ?? bootstrap.user.email} · Salt okunur`
    : 'Öğretmen çalışma modu';
  return <SafeAreaView edges={['top']} style={{ backgroundColor: color.sidebar }}>
    <View style={{ paddingHorizontal: space[3], paddingVertical: space[2] }} testID="admin-overlay-banner">
      <Text variant="bodyStrong">{title}</Text>
      <Button label="Yönetim paneline dön" variant="quiet" loading={pending} testID="exit-admin-overlay" onPress={() => {
        setPending(true);
        void exitAdminOverlay().catch(() => undefined).finally(() => { setPending(false); router.replace('/'); });
      }} />
    </View>
  </SafeAreaView>;
}
