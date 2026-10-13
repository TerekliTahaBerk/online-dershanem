import { parseOdkManagementPackages } from '@contracts/odk-management-read';
import { useState } from 'react';
import { EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { QueryView, usePullToRefresh } from '../shared';
import { openOnWeb } from '../../shell/web-continuation';
import { useOdkManagementQuery } from './management-shared';
const sales = { AVAILABLE: 'Satışta', SOLD_OUT: 'Tükendi', PAUSED: 'Duraklatıldı', CLOSED: 'Kapalı' };
const exceptions: Record<string, string> = { BLOCK_NEW_ORDERS: 'Yeni siparişi engelle', RESCHEDULE_OR_EXTEND_ACCESS: 'Yeniden planla veya erişimi uzat', EXTEND_ACCESS: 'Erişimi uzat', RESCHEDULE_OR_REFUND: 'Yeniden planla veya iade et', REFUND: 'İade et', BEFORE_FIRST_ATTEMPT: 'İlk denemeden önce iade', NO_AUTOMATIC_REFUND: 'Otomatik iade yok', FULL_REFUND: 'Tam iade', ADMIN_GRANT_WITH_REASON_AND_EXPIRY: 'Gerekçeli ve süreli admin erişimi' };
const date = (v: string | null) => v ? formatShortDateTime(v) : 'Sınır yok';
export default function OdkManagementPackagesScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const query = useOdkManagementQuery('packages', async (api, signal) => { const parsed = parseOdkManagementPackages(await api.request('/api/panel/odk/management/packages', { signal })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value; });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="odk-management-packages" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Deneme Ligi paketleri" description="Paket, hak ve deneme sözleşmelerini incele. Bu ekran salt okunurdur." />
    <QueryView query={query}>{(data) => <>{!data.rows.length && <EmptyState title="Henüz Deneme Ligi paketi yok" />}
      <Section title="Paketler" first>{data.rows.map((p) => <Row key={p.id} title={p.title} subtitle={`${(p.priceCents / 100).toLocaleString('tr-TR')} ₺ · ${p.policy ? sales[p.policy.sales.state] : 'Sözleşme geçersiz'} · ${p.exams.length} deneme · ${p.orderCount} sipariş / ${p.entitlementCount} hak`} onPress={() => setSelected(p.id)} testID={`odk-package-${p.id}`} />)}</Section>
      {data.rows.filter((p) => p.id === selected).map((p) => <Section key={p.id} title={p.title}>
        <StatusBadge label={p.isActive ? 'Aktif' : 'Pasif'} /><Text>Sözleşme v{p.contractVersion} · /{p.slug}</Text>
        {p.policy ? <><Text>Satış: {sales[p.policy.sales.state]} · {date(p.policy.sales.startsAt)} – {date(p.policy.sales.endsAt)}</Text>
          <Text>Erişim başlangıcı: {p.policy.access.starts === 'PURCHASED_AT' ? 'Satın alındığında' : date(p.policy.access.startsAt)}</Text>
          <Text>Erişim süresi: {p.policy.access.durationDays ? `${p.policy.access.durationDays} gün` : date(p.policy.access.endsAt)}</Text>
          <Text>Rapor hakları: öğrenci {p.policy.rights.studentReports ? 'var' : 'yok'} · veli {p.policy.rights.parentReports ? 'var' : 'yok'} · öğretmen {p.policy.rights.teacherReports ? 'var' : 'yok'}</Text>
          <Text>Canlı hizmet: {p.policy.rights.liveService ? 'dahil' : 'dahil değil'}</Text>
          {Object.entries(p.policy.exceptions).map(([key, value]) => <Text key={key}>{({ soldOut: 'Tükenme', outage: 'Kesinti', cancellation: 'İptal', refund: 'İade', exceptionalAccess: 'Özel erişim' } as Record<string, string>)[key]}: {exceptions[value] || value}</Text>)}
        </> : <EmptyState title="Paket sözleşmesi geçersiz" body="Kurallar doğrulanamadı. Yönetimde sözleşmeyi düzeltin." />}
        <Text variant="label">Paket → hak → deneme eşlemesi</Text>
        {p.exams.length ? p.exams.map((e) => <Row key={e.id} title={e.title} subtitle={`${e.seriesTitle || 'Serisiz'} · ${e.startsAt ? formatShortDateTime(e.startsAt) : 'Planlanmadı'} – ${e.endsAt ? formatShortDateTime(e.endsAt) : '—'}\nGeç giriş ${e.lateEntryMinutes} dk · ${e.attemptLimit} deneme hakkı\nSonuç ${e.resultsReleasedAt ? formatShortDateTime(e.resultsReleasedAt) : 'Planlanmadı'} · Anahtar ${e.answerKeyReleasedAt ? formatShortDateTime(e.answerKeyReleasedAt) : 'Planlanmadı'}\nCanlı hizmet ${e.meetRequired ? 'zorunlu' : 'isteğe bağlı'} · Denemeyi web’de aç`} onPress={() => void openOnWeb(`/panel/odk/yonetim/sinavlar/${encodeURIComponent(e.id)}`)} />) : <EmptyState title="Pakete bağlı deneme yok" />}
      </Section>)}
    </>}</QueryView>
  </Screen>;
}
