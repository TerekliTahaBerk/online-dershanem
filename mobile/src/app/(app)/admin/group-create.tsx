import GroupCreateScreen from '@/features/admin/group-create';
import { AdminRouteGate } from '@/features/admin/shared';

export default function AdminGroupCreateRoute() {
  return <AdminRouteGate><GroupCreateScreen /></AdminRouteGate>;
}
