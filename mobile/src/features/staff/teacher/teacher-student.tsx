import { useState } from 'react';

import { EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { FilterChips, MetricGrid, MetricTile } from '@/features/admin/ui';
import { fetchTeacherStudent360 } from '@/lib/api/staff';
import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

export default function TeacherStudentScreen({ studentId }: { studentId: string }) {
  const [nav, setNav] = useState<{ sekme?: string; gorunum?: string }>({});
  const query = useStaffQuery('OD', 'teacher-student', (api, signal) => fetchTeacherStudent360(api, studentId, nav, signal), { params: { studentId, sekme: nav.sekme ?? '', gorunum: nav.gorunum ?? '' } });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-student">
    <QueryView query={query}>{(data) => <>
      <PageHeader title={data.summary.name} description={[data.summary.email, data.summary.detail].filter(Boolean).join(' · ')} />
      <Text tone="secondary">{data.summary.groups}</Text>
      <StatusBadge label={`Risk: ${data.summary.risk.label}`} tone={data.summary.risk.tone} />
      <FilterChips label="Öğrenci profili sekmeleri" value={data.group} onChange={(sekme) => setNav({ sekme })} options={data.groups.map((item) => ({ value: item.id, label: item.label }))} />
      {data.views.length ? <FilterChips label="Öğrenme görünümleri" value={data.view ?? data.views[0].id} onChange={(gorunum) => setNav({ sekme: data.group, gorunum })} options={data.views.map((item) => ({ value: item.id, label: item.label }))} /> : null}
      {data.cards.length ? data.cards.map((card, index) => <Section key={card.id} title={card.title} first={index === 0}>
        {card.metrics.length ? <MetricGrid>{card.metrics.map((item) => <MetricTile key={item.label} label={item.label} value={item.value} hint={item.hint ?? undefined} tone={item.tone} />)}</MetricGrid> : null}
        {card.rows.map((item, i) => <Row key={`${item.title}-${i}`} title={item.title} subtitle={item.subtitle} meta={item.meta} trailing={item.badge ? <StatusBadge {...item.badge} /> : undefined} />)}
        {card.empty ? <Text tone="muted">{card.empty}</Text> : null}
      </Section>) : <EmptyState title="Bu sekmede gösterilecek veri yok" />}
    </>}</QueryView>
  </Screen>;
}
