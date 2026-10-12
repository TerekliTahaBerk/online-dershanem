import type { AdminAnalytics, AdminAudit, AdminGain } from '@contracts/admin-system';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Banner, Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text, TextField } from '@/design/primitives';
import { color, space } from '@/design/tokens';
import { fetchAdminAnalytics, fetchAdminAudit, fetchAdminFeatures, fetchAdminQuality, type AnalyticsFilters } from '@/lib/api/admin-system';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { QueryView, useAdminQuery, usePullToRefresh } from './shared';
import { FilterChips, MetricGrid, MetricTile } from './ui';
export const emptyAnalyticsFilters: AnalyticsFilters = { from: '', to: '', examType: 'ALL', product: 'ALL', classLevel: '', groupId: '', teacherId: '' };
const labels: Record<keyof AnalyticsFilters, string> = { from: 'Başlangıç (YYYY-AA-GG)', to: 'Bitiş (YYYY-AA-GG)', classLevel: 'Sınıf düzeyi', groupId: 'Grup kimliği', teacherId: 'Öğretmen kimliği', examType: 'Sınav türü', product: 'Ürün' };
export function AdminAnalyticsScreen({ metric, initialFilters = emptyAnalyticsFilters }: { metric?: string; initialFilters?: AnalyticsFilters }) {
  const router = useRouter(); const [draft, setDraft] = useState(initialFilters); const [filters, setFilters] = useState(initialFilters);
  const query = useAdminQuery('analytics', (api, signal) => fetchAdminAnalytics(api, filters, signal), { params: filters });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="admin-analytics">
    <PageHeader title={metric ? 'Metrik detayı' : 'Analitik'} description="Veriler İstanbul saatine göre hesaplanır. Başarı metriklerinde en az 10 öğrenci gerekir." />
    <Section title="Filtreler" first>
      <FilterChips label="Ürün" value={draft.product} onChange={(product) => setDraft({ ...draft, product })} options={['ALL', 'OD', 'OK', 'ODK'].map((value) => ({ value, label: value === 'ALL' ? 'Tüm ürünler' : value }))} />
      <FilterChips label="Sınav türü" value={draft.examType} onChange={(examType) => setDraft({ ...draft, examType })} options={['ALL', 'LGS', 'TYT', 'AYT', 'YDT'].map((value) => ({ value, label: value === 'ALL' ? 'Tüm sınavlar' : value }))} />
      {(['from', 'to', 'classLevel', 'groupId', 'teacherId'] as const).map((key) => <TextField key={key} label={labels[key]} value={draft[key]} onChangeText={(value) => setDraft({ ...draft, [key]: value })} maxLength={key === 'from' || key === 'to' ? 10 : key === 'classLevel' ? 32 : 80} autoCorrect={false} testID={`analytics-${key}`} />)}
      <Button label="Filtreleri uygula" onPress={() => setFilters({ ...draft })} testID="analytics-apply" />
    </Section>
    <QueryView query={query}>{(data) => {
      const selected = metric ? data.metrics.find((m) => m.key === metric) : null;
      return <>{data.filters.notice ? <Banner tone="warning">{data.filters.notice}</Banner> : null}
        <Text tone="secondary">{data.filters.from} – {data.filters.to} · {data.timezone} · {data.ruleVersion}</Text>
        {metric ? selected ? <Section title={selected.label}><Text variant="numeric">{selected.display}</Text><Text>{selected.definition}</Text><Text>Payda: {selected.denominator}</Text><Text>Kaynak: {selected.querySource}</Text><Text>Tarih anlamı: {selected.dateSemantics} · {selected.timezone}</Text></Section> : <EmptyState title="Metrik bulunamadı" /> : <Section title="Metrikler"><MetricGrid>{data.metrics.map((m) => <MetricTile key={m.key} label={m.label} value={m.display} testID={`metric-${m.key}`} onPress={() => router.push(`/admin/metric/${encodeURIComponent(m.key)}?${new URLSearchParams(filters)}` as Href)} />)}</MetricGrid></Section>}
        {!metric || selected ? <><SummarySections sections={data.sections} /><Gains gains={data.gains} /></> : null}
      </>;
    }}</QueryView>
  </Screen>;
}
function SummarySections({ sections }: { sections: AdminAnalytics['sections'] }) { return <>{sections.map((s) => <Section key={s.title} title={s.title}>{s.items.length ? s.items.map((row, i) => <Row key={`${row.label}-${i}`} title={row.label} subtitle={row.value || undefined} />) : <EmptyState title="Bu aralıkta veri yok" />}</Section>)}</>; }
function Gains({ gains }: { gains: AdminGain[] }) {
  return <Section title="Sınav kohortları">{gains.map((g) => <View key={g.exam} style={{ gap: space[2] }}>
    <Text variant="bodyStrong">{g.exam}</Text>
    {g.status === 'READY' ? <><StatusBadge label="Yeterli örnek" tone="success" /><Text>Medyan değişim: {g.medianChange > 0 ? '+' : ''}{g.medianChange} puan · Orta %50: {g.lowerQuartile} – {g.upperQuartile}</Text>
      <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: g.positiveChangePercent }} accessibilityLabel={`${g.exam}: pozitif değişim yüzde ${g.positiveChangePercent}`} style={{ height: space[2], backgroundColor: color.border }}><View style={{ height: space[2], width: `${Math.max(0, Math.min(100, g.positiveChangePercent))}%`, backgroundColor: color.primary }} /></View>
      <Text>Pozitif değişim %{g.positiveChangePercent} · Medyan aralık {g.medianGapDays} gün</Text><Text>Kapsama %{g.coveragePercent ?? '—'} · {g.observedStudents} gözlenen öğrenci · {g.pairedStudents} eşleşme{g.dataThrough ? ` · ${formatShortDateTime(g.dataThrough)}` : ''}</Text></> : <Banner tone="info">10 öğrenciden az uygun öğrenci; örneklem sayısı, değişim ve veri tarihi gizlendi.</Banner>}
  </View>)}</Section>;
}
const auditTypes = [{ value: '', label: 'Tümü' }, { value: 'User', label: 'Kişiler' }, { value: 'Group', label: 'Gruplar' }, { value: 'Lesson', label: 'Dersler' }, { value: 'ParentStudent', label: 'Veli bağlantıları' }, { value: 'LeadSubmission', label: 'Talepler' }, { value: 'OdOrder', label: 'Siparişler' }];
function AuditRows({ logs }: { logs: AdminAudit['logs'] }) { return <Section title={`Son işlemler (${logs.length})`}>{logs.length ? logs.map((log) => <Row key={log.id} title={log.summary} subtitle={`${log.actor} · ${log.action}`} meta={`${log.entityType} · ${formatShortDateTime(log.createdAt)}`} />) : <EmptyState title="Bu türde henüz işlem yok" />}</Section>; }
export function AdminAuditScreen() {
  const [tur, setType] = useState(''); const query = useAdminQuery('audit', (api, signal) => fetchAdminAudit(api, tur, signal), { params: { tur } }); const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="İşlem geçmişi" description="En yeni 100 kayıt gösterilir." /><FilterChips label="Kayıt türü" value={tur} onChange={setType} options={auditTypes} /><QueryView query={query}>{(data) => <AuditRows logs={data.logs} />}</QueryView></Screen>;
}
export function AdminFeaturesScreen() {
  const query = useAdminQuery('features', fetchAdminFeatures); const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Özellik envanteri" description="Deployment'ın sunucuda çözülen özellik durumu." /><QueryView query={query}>{(data) => <>
    <Banner tone={data.features.some((f) => f.legacyPublicDrift) ? 'warning' : 'success'}>{data.features.filter((f) => f.enabled).length}/{data.features.length} açık · {data.features.filter((f) => f.legacyPublicDrift).length} eski public değerinde uyumsuzluk</Banner>
    {data.features.map((f) => <Section key={f.key} title={f.label}><StatusBadge label={`${f.enabled ? 'Açık' : 'Kapalı'} · ${f.status}`} tone={f.enabled ? 'success' : 'neutral'} /><Text>Sorumlu: {f.owner} · Roller: {f.roles.join(', ')}</Text><Text>Veri: {f.dataDependency}</Text><Text>Test kapsamı: {f.e2eCoverage}</Text><Text>Geri alma: {f.rollback}</Text><Text>{f.environmentKey} · {f.source} · Varsayılan {f.defaultEnabled ? 'açık' : 'kapalı'}</Text>{f.legacyPublicConfigured ? <Text>Eski public değişken tanımlı{f.legacyPublicDrift ? '; sunucu değeriyle uyumsuz' : ''}.</Text> : null}</Section>)}
    <AuditRows logs={data.logs} />
  </>}</QueryView></Screen>;
}
export function AdminQualityScreen() {
  const query = useAdminQuery('quality', fetchAdminQuality); const refresh = usePullToRefresh(() => query.refetch());
  return <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Öğrenme kalitesi" description="Son 180 gün · öğrenci veya öğretmen sıralaması üretilmez." /><QueryView query={query}>{(data) => <>
    <Banner tone="info">Nedensel öğretmen etkisi ölçülmez. Değişim için en az {data.minStudents} öğrenci ve aynı sınavda {data.minGapDays} gün aralıklı iki ölçüm gerekir.</Banner>
    <Text tone="secondary">{data.ruleVersion}</Text><SummarySections sections={data.sections} /><Gains gains={data.gains} />
    <Section title="Ortak eksik sinyalleri">{data.commonErrors.length ? data.commonErrors.map((e) => <Row key={e.label} title={e.label} subtitle={`${e.students} öğrenci`} />) : <EmptyState title="Minimum örneklemi geçen ortak hata sinyali yok" />}</Section>
  </>}</QueryView></Screen>;
}
