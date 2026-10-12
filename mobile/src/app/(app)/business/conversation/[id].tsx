import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/design/primitives';
import { BusinessConversationScreen, BusinessGate } from '@/features/business/business';

/** İşletme · konuşma detayı (P2.7). "Mesaj Kutusu" bölümü görünür olmalı. */
export default function BusinessConversationRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <BusinessGate slug="mesaj-kutusu">{typeof id === 'string' && id ? <BusinessConversationScreen id={id} /> : <EmptyState title="Konuşma bulunamadı" />}</BusinessGate>;
}
