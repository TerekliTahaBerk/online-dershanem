import AdminPreviewScreen from '@/features/admin/preview';
import { AdminRouteGate } from '@/features/admin/shared';

export default function PreviewRoute() {
  return <AdminRouteGate><AdminPreviewScreen /></AdminRouteGate>;
}
