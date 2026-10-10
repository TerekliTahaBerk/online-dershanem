import { useLocalSearchParams } from 'expo-router';

import { CoachSessionScreen } from '@/features/staff/coach/coach-session';
import { StaffRouteGate } from '@/features/staff/shared';

/** Koçluk görüşmesi — yalnız Yön çalışma alanında; aktif koç ataması sunucuda doğrulanır. */
export default function CoachSessionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffRouteGate product="OK" navId="coach-sessions">{typeof id === 'string' ? <CoachSessionScreen sessionId={id} /> : null}</StaffRouteGate>;
}
