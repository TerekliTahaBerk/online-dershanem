import { Stack, useLocalSearchParams } from 'expo-router';

import { EmptyState, Screen } from '@/design/primitives';
import { NativeScreenView } from '@/features/shell/native-screen-view';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { findNavItem, resolveNativeScreen } from '@/navigation/native-screens';

/**
 * Menüdeki birincil olmayan öğeler. `id` derin bağlantıdan da gelebilir:
 * yalnız sunucunun bu kullanıcı + çalışma alanı için verdiği menüde varsa
 * açılır; yoksa güvenli boş durum (yetkisiz hedef açılmaz).
 */
export default function MenuItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const bootstrap = useReadyBootstrap();
  const navigation = bootstrap.workspace?.navigation;
  const item = navigation && typeof id === 'string' ? findNavItem(navigation, id) : null;
  if (!item) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Bulunamadı' }} />
        <EmptyState title="Bu bölümü burada bulamadık" body="Bağlantı başka bir alana ait olabilir ya da erişimin değişmiş olabilir." />
      </Screen>
    );
  }
  const screen = resolveNativeScreen({ role: bootstrap.user.role, workspace: bootstrap.workspace?.activeProduct ?? null, item });
  return (
    <>
      <Stack.Screen options={{ title: item.label }} />
      <NativeScreenView context="stack" screen={screen} />
    </>
  );
}
