import type { TeacherRosterFilter } from '@contracts/teacher-roster';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { EmptyState, PageHeader, Row, Screen, Section, StatusBadge } from '@/design/primitives';
import { FilterChips } from '@/features/admin/ui';
import { fetchTeacherRoster } from '@/lib/api/staff';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

const risk = { none: { label: 'Normal', tone: 'success' }, low: { label: 'Düşük', tone: 'warning' }, medium: { label: 'Orta', tone: 'warning' }, high: { label: 'Yüksek', tone: 'critical' } } as const;

export default function TeacherStudentsScreen() {
  const [filter, setFilter] = useState<TeacherRosterFilter>('all');
  const query = useStaffQuery('OD', 'teacher-students', (api, signal) => fetchTeacherRoster(api, filter, signal), { params: { filter } });
  const refresh = usePullToRefresh(() => query.refetch());
  const router = useRouter();
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-students">
    <PageHeader title="Öğrencilerin" description="Yalnız sana atanmış aktif gruplardaki öğrenciler." />
    <QueryView query={query}>{(data) => <>
      <FilterChips label="Öğrenci görünümü" value={data.filter} onChange={setFilter} options={data.filters.map((item) => ({ value: item.id, label: item.label }))} />
      {data.rows.length ? <Section title={`${data.totalCount} öğrenci`} first>{data.rows.map((item) => <Row
        key={item.studentId} title={item.name} subtitle={`${item.groupName} · ${item.riskReason ?? 'Her şey yolunda görünüyor 🌱'}`}
        meta={[item.lastLessonAt ? `Son ders: ${formatShortDateTime(item.lastLessonAt)}${item.lastLessonTitle ? ` · ${item.lastLessonTitle}` : ''}` : null, item.planLabel, item.examDeltaLabel ? `${item.examDeltaLabel} net` : null].filter(Boolean).join(' · ')}
        trailing={<StatusBadge {...risk[item.riskLevel]} />}
        onPress={() => router.push(`/teacher/student/${encodeURIComponent(item.studentId)}` as Href)}
      />)}</Section> : <EmptyState title={data.totalCount ? 'Bu filtrede öğrenci görünmüyor' : 'Sana atanmış aktif bir öğrenci henüz yok'} />}
    </>}</QueryView>
  </Screen>;
}
