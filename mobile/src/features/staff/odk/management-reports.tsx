import { parseOdkManagementReports, type OdkManagementReports } from '@contracts/odk-management-reports';
import { useState } from 'react';
import { Button, EmptyState, PageHeader, Row, Screen, Section, SegmentedTabs, Text, TextField } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { formatDayMonth } from '@/lib/format/istanbul';
import { QueryView, usePullToRefresh } from '../shared';
import { useOdkManagementQuery } from './management-shared';
const net = (v: number | null) => v == null ? '—' : v.toFixed(2);
export default function OdkManagementReportsScreen() {
  const [search, setSearch] = useState(''); const [q, setQuery] = useState(''); const [group, setGroup] = useState(''); const [student, setStudent] = useState<string | null>(null);
  const params = new URLSearchParams({ q, grup: group, ...(student ? { ogrenci: student } : {}) }).toString();
  const query = useOdkManagementQuery(`reports:${params}`, async (api, signal) => { const parsed = parseOdkManagementReports(await api.request(`/api/panel/odk/management/reports?${params}`, { signal })); if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' }); return parsed.value; }, { gcTime: 0 });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="odk-management-reports" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><PageHeader title="Sonuç raporları" description="Açıklanmış sonuçlar ve öğrencinin kendi önceki ölçümüne göre eğilimleri; sıralama yapılmaz." />
    {student && <Button label="‹ Tüm öğrenciler" variant="secondary" onPress={() => setStudent(null)} />}
    <Section title="Öğrenci ara" first><TextField label="Ad soyad" value={search} onChangeText={setSearch} maxLength={80} /><Button label="Süz" onPress={() => { setQuery(search); setStudent(null); }} /></Section>
    <QueryView query={query}>{(data) => <>
      {data.groups.length > 1 && <Section title="Sınıf"><SegmentedTabs label="Sınıf filtresi" value={group} onChange={(v) => { setGroup(v); setStudent(null); }} options={[{ value: '', label: 'Tümü' }, ...data.groups.map((v) => ({ value: v, label: v }))]} /></Section>}
      {data.report ? <ReportDetail report={data.report} /> : <Section title="Öğrenciler">{!data.rows.length && <EmptyState title="Raporu görülebilen öğrenci yok" />}{data.rows.map((r) => <Row key={r.studentId} testID={`odk-report-${r.studentId}`} title={r.name} subtitle={`${r.context}\n${r.latestTitle || 'Açıklanmış sonuç yok'} · ${net(r.latestNet)} net · Δ ${net(r.delta)}\n${r.examCount} deneme · ${r.weakOutcomes} gelişim alanı`} onPress={() => setStudent(r.studentId)} />)}
        {data.total > data.rowLimit && <Text>İlk {data.rowLimit} öğrenci gösteriliyor ({data.total} kayıt). Daraltmak için arayın.</Text>}
      </Section>}
    </>}</QueryView>
  </Screen>;
}
function ReportDetail({ report }: { report: NonNullable<OdkManagementReports['report']> }) {
  const latest = report.exams.find((e) => e.id === report.latestExamId);
  return <><Section title={report.studentName}>
    {!report.available || !latest ? <EmptyState title="Açıklanmış sonuç henüz yok" /> : <>
      <Text variant="label">Son açıklanan · {latest.title}</Text><Text>{latest.family} · {formatDayMonth(latest.takenAt)} · {net(report.latestNet)} net</Text>
      <Text>{latest.correctCount} doğru · {latest.wrongCount} yanlış · {latest.blankCount} boş</Text>
      <Text>Kendi önceki denemesine göre: {report.delta == null ? 'İlk deneme' : `${report.delta > 0 ? '+' : ''}${net(report.delta)} net`}</Text>
      {report.summary.map((line) => <Text key={line}>{line}</Text>)}
    </>}
  </Section>
    <Section title="Deneme geçmişi">{report.exams.map((e) => <Row key={e.id} title={e.title} subtitle={`${e.family} · ${formatDayMonth(e.takenAt)}`} meta={`${net(e.totalNet)} net · ${e.correctCount} D · ${e.wrongCount} Y · ${e.blankCount} B`} />)}</Section>
    <Section title={`Kazanım eğilimleri · ${report.weakCount} kazanım %${report.weakThreshold} altında`}>
      <Text>Yüzde, bağlı sorulardaki doğru oranıdır. Az sorulu ölçümlerde yeni kanıt bekleyin.</Text>
      {!report.outcomes.length && <EmptyState title="Kazanım verisi yok" />}{report.outcomes.map((t) => <Row key={t.id} title={t.title} subtitle={`${t.code} · ${t.unitName}\n%${Math.round(t.latestAccuracy)} · ${t.delta == null ? 'İlk ölçüm' : Math.abs(t.delta) < 10 ? 'Benzer düzey' : `${t.delta > 0 ? '+' : ''}${Math.round(t.delta)} puan`}\n${t.evidenceCount} deneme · ${t.questionCount} soru${t.questionCount < 3 ? ' · Yeni kanıt gerekli' : ''}`} />)}
      <Text tone="muted">Tek bir denemeyi kesin yargı olarak kullanmayın; tekrarlayan kazanım kanıtını ve öğrencinin kendi eğilimini izleyin.</Text>
    </Section>
  </>;
}
