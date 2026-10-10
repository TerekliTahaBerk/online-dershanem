import { resolveNativeScreen } from '@/navigation/native-screens';
import { useReadyBootstrap } from '@/lib/auth/session-provider';

import { NativeScreenView } from './native-screen-view';
import { StaffHomeScreen } from './staff-home';

/**
 * Sekme yuvası: `navigation.primary[slot]` öğesini rol + çalışma alanına göre
 * native ekrana çevirir. Yönetimde (ADMIN, yalnız web) ve çalışma alanı
 * olmayan öğretmende ilk yuva bilgi ana sayfasıdır. Öğretmen (M7) ilk yuvada
 * çalışma alanının Bugün'ünü görür (OD öğretmen / Yön koç / Deneme Ligi
 * raporları); personel öğrenci sekmelerine asla düşmez.
 */
export function SlotScreen({ slot }: { slot: 0 | 1 | 2 | 3 }) {
  const bootstrap = useReadyBootstrap();
  const role = bootstrap.user.role;
  if (role === 'ADMIN') return slot === 0 ? <StaffHomeScreen /> : null;
  if (role === 'TEACHER' && slot !== 0) return null;
  const item = bootstrap.workspace?.navigation.primary[slot];
  if (role === 'TEACHER' && !item) return <StaffHomeScreen />;
  if (!item) return null;
  return <NativeScreenView context="tab" screen={resolveNativeScreen({ role, workspace: bootstrap.workspace?.activeProduct ?? null, item })} />;
}
