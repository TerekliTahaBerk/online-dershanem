import { useLocalSearchParams } from 'expo-router';

import OdReviewRecoveryScreen from '@/features/od/od-review-recovery';
import { OdRouteGate } from '@/features/od/shared';

/**
 * Tekrar / telafi doğrudan hedef (Bugün eylemi, ders detayı, bildirim).
 * `tab` ve `lessonId` yalnız görünüm seçimidir; yetki sunucudadır.
 */
export default function ReviewRecoveryRoute() {
  const params = useLocalSearchParams<{ tab?: string; lessonId?: string }>();
  const tab = params.tab === 'telafi' ? 'telafi' : params.tab === 'tekrar' ? 'tekrar' : undefined;
  const lessonId = typeof params.lessonId === 'string' && /^[\w-]{1,64}$/.test(params.lessonId) ? params.lessonId : null;
  return (
    <OdRouteGate navId="review-recovery">
      <OdReviewRecoveryScreen initialTab={tab} lessonId={lessonId} />
    </OdRouteGate>
  );
}
