import { parseMockExamsAdmin } from '@contracts/admin-rollout';
import { useState } from 'react';
import { PageHeader, Screen } from '@/design/primitives';
import { MockExamsBody } from '@/features/admin/rollout';
import { ApiError } from '@/lib/api/errors';
import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

export default function TeacherMockExamsScreen() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const query = useStaffQuery('OD', 'mock-exams', async (api, signal) => {
    const search = studentId ? `?${new URLSearchParams({ ogrenci: studentId })}` : '';
    const parsed = parseMockExamsAdmin(await api.request<unknown>(`/api/panel/staff/teacher/mock-exams${search}`, { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  }, { params: { studentId } });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="teacher-mock-exams" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
    <PageHeader title="Denemeden eyleme" description="Öğrencinin kendi eğilimini izle, hata nedenlerini düzelt ve tek küçük sonraki adımı onayla." />
    <QueryView query={query}>{(data) => <MockExamsBody key={data.studentId} data={data} onStudent={setStudentId} />}</QueryView>
  </Screen>;
}
