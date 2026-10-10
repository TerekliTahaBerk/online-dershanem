import { useLocalSearchParams } from 'expo-router';

import { AssignmentDetailScreen } from '@/features/od/assignments/assignment-detail';
import { OdRouteGate } from '@/features/od/shared';

/** OD çalışma detayı — yalnız OD çalışma alanında ve "Çalışmalar" menüdeyken. */
export default function AssignmentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OdRouteGate navId="assignments">{typeof id === 'string' ? <AssignmentDetailScreen assignmentId={id} /> : null}</OdRouteGate>;
}
