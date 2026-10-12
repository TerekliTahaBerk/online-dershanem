import { useLocalSearchParams } from 'expo-router';
import { StaffRouteGate } from '@/features/staff/shared';
import TeacherStudentScreen from '@/features/staff/teacher/teacher-student';

export default function TeacherStudentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <StaffRouteGate product="OD" navId="students">{typeof id === 'string' ? <TeacherStudentScreen studentId={id} /> : null}</StaffRouteGate>;
}
