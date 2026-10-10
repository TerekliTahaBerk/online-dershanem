import { useLocalSearchParams } from 'expo-router';

import { CoachPlanScreen } from '@/features/staff/coach/coach-plan';
import { StaffRouteGate } from '@/features/staff/shared';

/** Koç plan detayı — yalnız Yön çalışma alanında ve "Haftalık plan" menüdeyken; aktif koç ataması sunucuda doğrulanır. */
export default function CoachPlanRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffRouteGate product="OK" navId="plan">{typeof id === 'string' ? <CoachPlanScreen planId={id} /> : null}</StaffRouteGate>;
}
