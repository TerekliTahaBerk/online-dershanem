import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/design/primitives';
import { AdminRouteGate } from '@/features/admin/shared';
import Student360Screen from '@/features/admin/student-360';

/** Yönetim · Öğrenci 360 (Faz 2.2). Yalnız ADMIN; sunucu ayrıca doğrular. */
export default function AdminStudentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminRouteGate>{typeof id === 'string' && id ? <Student360Screen studentProfileId={id} /> : <EmptyState title="Öğrenci bulunamadı" />}</AdminRouteGate>;
}
