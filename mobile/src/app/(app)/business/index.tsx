import { BusinessGate, BusinessHomeScreen } from '@/features/business/business';

/** İşletme alanı girişi (P2.7). Görünürlük bootstrap'tan; sunucu her uçta ayrıca doğrular. */
export default function BusinessRoute() {
  return (
    <BusinessGate>
      <BusinessHomeScreen />
    </BusinessGate>
  );
}
