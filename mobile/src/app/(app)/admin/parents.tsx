import ParentsScreen from '@/features/admin/parents';
import { AdminRouteGate } from '@/features/admin/shared';

/** Yönetim · Veliler (Faz 2.2). Yalnız ADMIN; sunucu ayrıca doğrular. */
export default function AdminParentsRoute() {
  return (
    <AdminRouteGate>
      <ParentsScreen />
    </AdminRouteGate>
  );
}
