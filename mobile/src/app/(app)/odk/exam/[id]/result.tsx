import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/design/primitives';
import OdkExamResultScreen from '@/features/odk/exam-result';
import { isSafeExamId } from '@/features/odk/model';
import { OdkRouteGate } from '@/features/odk/shared';

/** Açıklanmış sonuç — kapı ayrıntıyla aynı; yayın koşulu sunucuda (yoksa 404). */
export default function OdkResultRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  return <OdkRouteGate>{isSafeExamId(params.id) ? <OdkExamResultScreen examId={params.id} /> : <EmptyState title="Bu sonucu bulamadık." />}</OdkRouteGate>;
}
