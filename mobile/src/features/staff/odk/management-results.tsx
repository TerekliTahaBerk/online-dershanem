import { router, type Href } from 'expo-router';
import { parseOdkManagementQueue } from '@contracts/odk-management-reports';
import { useState } from 'react';
import { EmptyState, PageHeader, Row, Screen, Section, SegmentedTabs } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { QueryView, usePullToRefresh } from '../shared';
import { useOdkManagementQuery, workspaceTarget } from './management-shared';
export default function OdkManagementResultsScreen() {
  const [stage, setStage] = useState('kuyruk');
  const query = useOdkManagementQuery(`results:${stage}`, async (api, signal) => { const parsed = parseOdkManagementQueue(await api.request(`/api/panel/odk/management/results?asama=${encodeURIComponent(stage)}`, { signal })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value; });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="odk-management-results" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Puanlama ve yayın" description="Puanlama sonucu öğrenciye açmaz. Yayın ayrı bir işlemdir." />
    <QueryView query={query}>{(data) => <><Section title="Yayın akışı" first><SegmentedTabs label="Kuyruk aşaması" value={data.tab} onChange={setStage} options={data.tabs.map((t) => ({ value: t.id, label: `${t.label} (${t.count})` }))} /></Section>
      <Section title="Denemeler">{!data.rows.length && <EmptyState title="Bu aşamada deneme yok" />}{data.rows.map((e) => <Row key={e.id} testID={`odk-queue-${e.id}`} title={e.title} subtitle={`${e.family} · ${e.stageLabel} · ${e.endsAt ? formatShortDateTime(e.endsAt) : 'Bitiş yok'}\n${e.submitted}/${e.assigned} teslim · ${e.scored} puanlandı · ${e.unscored} eksik · ${e.published} yayınlandı\n${e.review} bütünlük incelemesi bekliyor\n${e.actionLabel}`} onPress={() => router.push(workspaceTarget(e.href) as Href)} />)}</Section>
    </>}</QueryView>
  </Screen>;
}
