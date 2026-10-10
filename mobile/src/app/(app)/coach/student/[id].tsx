import { useLocalSearchParams } from 'expo-router';

import { CoachStudentScreen } from '@/features/staff/coach/coach-student';
import { StaffRouteGate } from '@/features/staff/shared';

/** Koç öğrenci sayfası — yalnız Yön çalışma alanında; aktif koç ataması sunucuda doğrulanır. */
export default function CoachStudentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffRouteGate product="OK" navId="coach-students">{typeof id === 'string' ? <CoachStudentScreen studentId={id} /> : null}</StaffRouteGate>;
}
