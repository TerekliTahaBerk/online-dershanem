import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/design/primitives';
import PersonDetailScreen from '@/features/admin/person-detail';
import { AdminRouteGate } from '@/features/admin/shared';

/** Yönetim kişi detayı (Faz 2.2). Yalnız ADMIN; sunucu ayrıca doğrular. */
export default function AdminPersonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AdminRouteGate>{typeof id === 'string' && id ? <PersonDetailScreen userId={id} /> : <EmptyState title="Kişi bulunamadı" />}</AdminRouteGate>;
}
