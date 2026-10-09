import { useLocalSearchParams } from 'expo-router';

import { LessonDetailScreen } from '@/features/od/lessons/lesson-detail';
import { OdRouteGate } from '@/features/od/shared';

/** OD ders detayı — yalnız OD çalışma alanında ve "Dersler" menüdeyken. */
export default function LessonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OdRouteGate navId="lessons">{typeof id === 'string' ? <LessonDetailScreen lessonId={id} /> : null}</OdRouteGate>;
}
