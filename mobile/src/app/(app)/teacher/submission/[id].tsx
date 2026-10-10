import { useLocalSearchParams } from 'expo-router';

import { TeacherSubmissionScreen } from '@/features/staff/teacher/teacher-submission';
import { StaffRouteGate } from '@/features/staff/shared';

/** Teslim değerlendirme — yalnız OD çalışma alanında ve "Çalışmalar" menüdeyken; grup öğretmenliği + aktif kayıt sunucuda. */
export default function TeacherSubmissionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffRouteGate product="OD" navId="assignments">{typeof id === 'string' ? <TeacherSubmissionScreen submissionId={id} /> : null}</StaffRouteGate>;
}
