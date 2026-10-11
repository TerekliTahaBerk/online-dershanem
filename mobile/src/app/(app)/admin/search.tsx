import GlobalSearchScreen from '@/features/admin/global-search';
import { AdminRouteGate } from '@/features/admin/shared';

/** Yönetim global araması (Faz 1). Yalnız ADMIN; sunucu ayrıca doğrular. */
export default function AdminSearchRoute() {
  return (
    <AdminRouteGate>
      <GlobalSearchScreen />
    </AdminRouteGate>
  );
}
