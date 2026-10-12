import { parseTeacherAnalysis, type TeacherAnalysis } from '@contracts/teacher-analysis';
import { useRouter, type Href } from 'expo-router';
import { EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { ApiError } from '@/lib/api/errors';
import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

const percent = (value: number | null) => value === null ? '—' : `%${value}`;
const delta = (value: number | null) => value === null ? '—' : `${value > 0 ? '+' : ''}${value.toLocaleString('tr-TR')}`;
export default function TeacherAnalysisScreen() {
  const query = useStaffQuery('OD', 'teacher-analysis', async (api, signal) => {
    const parsed = parseTeacherAnalysis(await api.request('/api/panel/staff/teacher/analysis', { signal }));
    if (!parsed.ok) throw new ApiError({ kind: 'invalid_response' });
    return parsed.value;
  });
  const refresh = usePullToRefresh(() => query.refetch());
  return <Screen testID="teacher-analysis" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}><QueryView query={query}>{(data) => <AnalysisBody data={data} />}</QueryView></Screen>;
}
function AnalysisBody({ data }: { data: TeacherAnalysis }) {
  const router = useRouter();
  const studentRow = (row: TeacherAnalysis['rows'][number]) => <Row key={row.studentId} title={row.studentName} subtitle={[row.classLevel, `Katılım ${percent(row.attendancePercent)}`, `Çalışma ${percent(row.assignmentPercent)}`, `Plan ${percent(row.planPercent)}`, `Net ${delta(row.netDelta)}`].filter(Boolean).join(' · ')} trailing={row.declining ? <StatusBadge label={row.riskHint || 'Düşüş'} tone="warning" /> : undefined} onPress={() => router.push(`/teacher/student/${encodeURIComponent(row.studentId)}` as Href)} testID={`analysis-student-${row.studentId}`} />;
  return <>
    <PageHeader title="Grup gidişatı" description={data.periodLabel} />
    {data.narrative.map((sentence, index) => <Text key={index} tone="secondary">{sentence}</Text>)}
    {!data.studentCount ? <EmptyState title="Kapsamda öğrenci yok" body="Aktif gruplarınıza öğrenci kaydı olduğunda gidişat özeti burada açılır." /> : <>
      <Section title="Grup ortalamaları"><Row title="Ortalama katılım" subtitle={percent(data.averages.attendancePercent)} /><Row title="Ortalama çalışma" subtitle={percent(data.averages.assignmentPercent)} /><Row title="Ortalama plan" subtitle={percent(data.averages.planPercent)} /><Row title="Medyan net değişim" subtitle={delta(data.averages.medianNetDelta)} /></Section>
      <Section title="Düşen gidişat">{data.rows.some((row) => row.declining) ? data.rows.filter((row) => row.declining).map(studentRow) : <Text tone="secondary">Şu an düşen gidişat listesinde öğrenci yok.</Text>}</Section>
      <Section title={`Tüm öğrenciler (${data.studentCount})`}>{data.rows.map(studentRow)}</Section>
    </>}
  </>;
}
