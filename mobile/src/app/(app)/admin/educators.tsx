import EducatorsScreen from '@/features/admin/educators';
import { AdminRouteGate } from '@/features/admin/shared';

/** Yönetim · Öğretmenler ve doluluk (Faz 2.2). Yalnız ADMIN; sunucu ayrıca doğrular. */
export default function AdminEducatorsRoute() {
  return (
    <AdminRouteGate>
      <EducatorsScreen />
    </AdminRouteGate>
  );
}
