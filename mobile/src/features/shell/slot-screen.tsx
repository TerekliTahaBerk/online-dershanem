import { resolveNativeScreen } from '@/navigation/native-screens';
import { useReadyBootstrap } from '@/lib/auth/session-provider';

import { NativeScreenView } from './native-screen-view';
import { StaffHomeScreen } from './staff-home';

/**
 * Sekme yuvası: `navigation.primary[slot]` öğesini rol + çalışma alanına göre
 * native ekrana çevirir. Öğretmen (M7) ilk yuvada çalışma alanının Bugün'ünü,
 * yönetim (Faz 1) Operasyon Merkezi'ni görür; menüsü boş personelde ilk yuva
 * bilgi ana sayfasıdır. Personel öğrenci sekmelerine asla düşmez.
 */
export function SlotScreen({ slot }: { slot: 0 | 1 | 2 | 3 }) {
  const bootstrap = useReadyBootstrap();
  const role = bootstrap.user.role;
  const item = bootstrap.workspace?.navigation.primary[slot];
  if ((role === 'TEACHER' || role === 'ADMIN') && !item) return <StaffHomeScreen />;
  if (!item) return null;
  return <NativeScreenView context="tab" screen={resolveNativeScreen({ role, workspace: bootstrap.workspace?.activeProduct ?? null, item })} />;
}
