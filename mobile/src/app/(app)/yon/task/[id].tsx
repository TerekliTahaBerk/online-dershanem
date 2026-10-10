import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/design/primitives';
import { YonRouteGate } from '@/features/yon/shared';
import YonTaskDetailScreen from '@/features/yon/task-detail';

/**
 * Yön plan görevi — yalnız Yön çalışma alanında ve "Planım" yetkili menüdeyken
 * (`adaptivePlan` açık) açılır. Kimlik yalnız URL-güvenli karakterlerle;
 * sahiplik sunucuda doğrulanır.
 */
export default function YonTaskRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const taskId = typeof params.id === 'string' && /^[\w-]{1,64}$/.test(params.id) ? params.id : null;
  return (
    <YonRouteGate navId="plan">
      {taskId ? <YonTaskDetailScreen taskId={taskId} /> : <EmptyState title="Bu görevi bulamadık." />}
    </YonRouteGate>
  );
}
