import { useLocalSearchParams } from 'expo-router';
import EducationEditorScreen from '@/features/admin/education-editor';
import { StaffRouteGate } from '@/features/staff/shared';

export default function TeacherEducationEditorRoute() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  return <StaffRouteGate product="OD" navId={kind === 'material' ? 'materials' : 'assignments'}><EducationEditorScreen teacherMode /></StaffRouteGate>;
}
