import { useLocalSearchParams } from 'expo-router';

import { BusinessGate, BusinessSectionScreen } from '@/features/business/business';

/** İşletme bölümü (P2.7). Yalnız bootstrap'ta görünen bölüm açılır. */
export default function BusinessSectionRoute() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const value = typeof slug === 'string' ? slug : '';
  return (
    <BusinessGate slug={value || '__none__'}>
      <BusinessSectionScreen slug={value} />
    </BusinessGate>
  );
}
