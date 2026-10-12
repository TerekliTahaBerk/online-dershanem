import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/design/primitives';
import { BusinessGate, BusinessLeadScreen } from '@/features/business/business';

/** İşletme · aday detayı (P2.7). "Adaylar" bölümü görünür olmalı. */
export default function BusinessLeadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BusinessGate slug="adaylar">{typeof id === 'string' && id ? <BusinessLeadScreen id={id} /> : <EmptyState title="Aday bulunamadı" />}</BusinessGate>;
}
