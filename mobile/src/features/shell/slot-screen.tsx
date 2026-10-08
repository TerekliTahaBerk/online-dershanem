import { resolveNativeScreen } from '@/navigation/native-screens';
import { useReadyBootstrap } from '@/lib/auth/session-provider';

import { NativeScreenView } from './native-screen-view';
import { StaffHomeScreen } from './staff-home';

/**
 * Sekme yuvası: `navigation.primary[slot]` öğesini rol + çalışma alanına göre
 * native ekrana çevirir. Personel / yönetimde ilk yuva bilgi ana sayfasıdır;
 * bu roller öğrenci sekmelerine asla düşmez.
 */
export function SlotScreen({ slot }: { slot: 0 | 1 | 2 | 3 }) {
  const bootstrap = useReadyBootstrap();
  const role = bootstrap.user.role;
  if (role === 'TEACHER' || role === 'ADMIN') return slot === 0 ? <StaffHomeScreen /> : null;
  const item = bootstrap.workspace?.navigation.primary[slot];
  if (!item) return null;
  return <NativeScreenView context="tab" screen={resolveNativeScreen({ role, workspace: bootstrap.workspace?.activeProduct ?? null, item })} />;
}
