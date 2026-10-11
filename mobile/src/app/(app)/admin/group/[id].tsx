import GroupDetailScreen from '@/features/admin/group-detail';
import { AdminRouteGate } from '@/features/admin/shared';

export default function AdminGroupRoute() {
  return <AdminRouteGate><GroupDetailScreen /></AdminRouteGate>;
}
