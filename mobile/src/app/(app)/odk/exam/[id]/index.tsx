import { useLocalSearchParams } from 'expo-router';

import { EmptyState } from '@/design/primitives';
import OdkExamDetailScreen from '@/features/odk/exam-detail';
import { isSafeExamId } from '@/features/odk/model';
import { OdkRouteGate } from '@/features/odk/shared';

/**
 * Deneme Ligi deneme ayrıntısı — yalnız Deneme Ligi çalışma alanında ve
 * "Denemeler" yetkili menüdeyken açılır. Kimlik yalnız URL-güvenli
 * karakterlerle; aktif sözleşme hakkı ve yayın sunucuda doğrulanır.
 */
export default function OdkExamRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  return <OdkRouteGate>{isSafeExamId(params.id) ? <OdkExamDetailScreen examId={params.id} /> : <EmptyState title="Deneme bulunamadı." />}</OdkRouteGate>;
}
