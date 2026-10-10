import { useLocalSearchParams } from 'expo-router';

import { TeacherLessonScreen } from '@/features/staff/teacher/teacher-lesson';
import { StaffRouteGate } from '@/features/staff/shared';

/** Öğretmen ders çalışma alanı — yalnız OD çalışma alanında ve "Dersler" menüdeyken; dersin öğretmeni sunucuda doğrulanır. */
export default function TeacherLessonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffRouteGate product="OD" navId="lessons">{typeof id === 'string' ? <TeacherLessonScreen lessonId={id} /> : null}</StaffRouteGate>;
}
