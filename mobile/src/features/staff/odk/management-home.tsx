import { parseOdkManagementHome } from '@contracts/odk-management-read';
import { useRouter, type Href } from 'expo-router';
import { EmptyState, PageHeader, Row, Screen, Section, Text } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { QueryView, usePullToRefresh } from '../shared';
import { openOnWeb } from '../../shell/web-continuation';
import { useOdkManagementQuery } from './management-shared';
const status: Record<string, string> = { DRAFT: 'Taslak', READY: 'Hazır', SCHEDULED: 'Planlandı', LIVE: 'Canlı', ENDED: 'Bitti', SCORED: 'Puanlandı', RELEASED: 'Yayımlandı', ARCHIVED: 'Arşiv' };
export default function OdkManagementHomeScreen() {
  const router = useRouter();
  const query = useOdkManagementQuery('home', async (api, signal) => { const parsed = parseOdkManagementHome(await api.request('/api/panel/odk/management/home', { signal })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value; });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="odk-management-home" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Deneme Ligi yönetimi" description="Sorumluluğundaki hazırlık, canlı operasyon ve yayın işlerini takip et." />
    <QueryView query={query}>{(data) => <>
      <Section title="Genel durum" first><Text>{data.weekCount} deneme takvimde{data.awaitingReleaseCount !== null ? ` · ${data.awaitingReleaseCount} deneme yayın bekliyor` : ""}</Text></Section>
      <Section title="Dikkat bekleyenler">{data.attention.length ? data.attention.map((row) => <Row key={row.key} title={row.title} subtitle={`${row.actionLabel} · Web'de aç`} onPress={() => void openOnWeb(row.href.split('?')[0])} />) : <EmptyState title="Sorumluluğunda bekleyen iş yok" />}</Section>
      <Section title="Yaklaşan">{data.upcoming.length ? data.upcoming.map((e) => <Row key={e.id} title={e.title} subtitle={`${e.family} · ${status[e.status] || e.status} · ${e.startsAt ? formatShortDateTime(e.startsAt) : 'Planlanmadı'} · Hazırlık ${e.readinessDone}/${e.readinessTotal} · Web’de aç`} onPress={() => void openOnWeb(`/panel/odk/yonetim/sinavlar/${encodeURIComponent(e.id)}`)} />) : <EmptyState title="Yaklaşan deneme yok" />}</Section>
      {data.modules.some((m) => m.id === 'odk-ops') && <Section title="Canlı">{data.live.length ? data.live.map((e) => <Row key={e.id} title={e.title} subtitle={`${e.active} aktif · ${e.submitted} teslim · ${e.assigned} atama`} onPress={() => router.push('/screen/odk-ops' as Href)} />) : <EmptyState title="Şu an canlı deneme yok" />}</Section>}
      <Section title="Son hareketler">{data.activity.length ? data.activity.map((e) => <Row key={e.id} title={e.label} subtitle={`${e.examTitle} · ${formatShortDateTime(e.at)}${e.actor ? ` · ${e.actor}` : ''}`} />) : <EmptyState title="Henüz hareket yok" />}</Section>
      <Section title="Çalışma alanları">{data.modules.map((m) => <Row key={m.id} title={m.title} onPress={() => router.push(`/screen/${encodeURIComponent(m.id)}` as Href)} testID={`odk-module-${m.id}`} />)}
        {data.pilotBlocked !== null && <Row title="Pilot hazırlığı" subtitle={`${data.pilotBlocked} bloke yayın kapısı`} onPress={() => router.push('/screen/odk-pilot' as Href)} testID="odk-pilot-readiness" />}
      </Section>
    </>}</QueryView>
  </Screen>;
}
