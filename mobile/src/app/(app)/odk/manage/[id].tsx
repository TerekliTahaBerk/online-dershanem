import { useLocalSearchParams } from 'expo-router';

import { OdkManagementExamScreen } from '@/features/staff/odk/management-exam';

/** K03 · Deneme çalışma alanı (web `/panel/odk/yonetim/sinavlar/[id]?sekme=`). Yetki sunucuda yeniden doğrulanır. */
export default function OdkManagementExamRoute() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  return <OdkManagementExamScreen examId={typeof id === 'string' ? id : ''} initialTab={typeof tab === 'string' ? tab : undefined} />;
}
