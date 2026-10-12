import { useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { GROUP_TABS, type GroupTab } from '@contracts/admin-education';

import { Banner, Button, PageHeader, Screen, Section } from '@/design/primitives';
import { fetchGroup360 } from '@/lib/api/admin-education';

import { EducationRows } from './education';
import { QueryView, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips, MetricGrid, MetricTile } from './ui';
import { GroupEditor, GroupMembers } from './group-management';

const LABELS: Record<GroupTab, string> = { genel: 'Genel', ogrenciler: 'Öğrenciler', program: 'Program', gecmis: 'Geçmiş', operasyon: 'Operasyon' };

export default function GroupDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; sekme?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const [tab, setTab] = useState<GroupTab>(GROUP_TABS.includes(params.sekme as GroupTab) ? params.sekme as GroupTab : 'genel');
  const query = useAdminQuery('group-360', (api, signal) => fetchGroup360(api, id, tab, signal), { params: { id, tab }, enabled: !!id });
  const refresh = usePullToRefresh(() => query.refetch());
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null);
  const onNotice = (text: string, error = false) => setNotice({ text, error });
  return (
    <Screen testID="admin-group-detail" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      {notice ? <Banner title={notice.error ? 'İşlem kaydedilemedi' : 'Kaydedildi'} tone={notice.error ? 'critical' : 'success'}>{notice.text}</Banner> : null}
      <QueryView query={query}>{(data) => <>
        <PageHeader title={data.name} description={[data.subject, data.level, data.teacherName].filter(Boolean).join(' · ')} />
        <MetricGrid>
          <MetricTile label="Doluluk" value={`${data.filled}/${data.capacity}`} />
          <MetricTile label="Haftalık ders" value={String(data.weeklyLessonCount)} />
        </MetricGrid>
        <Banner tone={data.reasons.length ? 'warning' : 'info'} title={data.status}>{data.reasons.length ? data.reasons.join('\n') : 'Güncel grup durumu.'}</Banner>
        <FilterChips value={tab} onChange={setTab} label="Grup bölümleri" options={GROUP_TABS.map((value) => ({ value, label: LABELS[value] }))} />
        {tab === 'program' ? <Button mutation label="Bu gruba ders planla" onPress={() => router.push(`/admin/education-editor?kind=lesson&group=${encodeURIComponent(id)}` as Href)} /> : null}
        {data.sections.map((section, index) => <Section key={section.id} title={section.title} first={index === 0}><EducationRows rows={section.rows} testID={`group-${section.id}`} editorKind={['upcoming', 'weekly', 'completed', 'cancelled'].includes(section.id) ? 'lesson' : undefined} /></Section>)}
        {tab === 'operasyon' ? <GroupEditor key={`${data.id}:${data.revision}`} group={data} onNotice={onNotice} /> : null}
        {tab === 'ogrenciler' ? <GroupMembers key={`${data.id}:${data.revision}`} group={data} onNotice={onNotice} /> : null}
      </>}</QueryView>
    </Screen>
  );
}
