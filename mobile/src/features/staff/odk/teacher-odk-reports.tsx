import { useState } from 'react';

import { Button, EmptyState, PageHeader, Row, Screen, Section, Text } from '@/design/primitives';
import { fetchOdkStaffReport, fetchOdkStaffStudents } from '@/lib/api/staff';
import { formatDayMonth } from '@/lib/format/istanbul';

import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

/**
 * DENEME LİGİ · İLİŞKİLİ ÖĞRENCİ RAPORLARI — SALT OKUNUR
 * (`odk:report:read_related`). Yalnız sunucunun ilişkili saydığı öğrenciler;
 * puanlama / yayın / anahtar / canlı operasyon YOK. Seçili öğrenci yalnız bellekte.
 */
export default function TeacherOdkReportsScreen() {
  const [studentId, setStudentId] = useState<string | null>(null);
  const students = useStaffQuery('ODK', 'odk-related-students', (api, signal) => fetchOdkStaffStudents(api, signal));
  const report = useStaffQuery('ODK', 'odk-related-report', (api, signal) => fetchOdkStaffReport(api, studentId!, signal), { params: { studentId }, enabled: Boolean(studentId), gcTime: 0 });
  const refresh = usePullToRefresh(() => (studentId ? report.refetch() : students.refetch()));
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-odk-reports">
      {studentId ? (
        <>
          <Button label="‹ Öğrenciler" variant="secondary" onPress={() => setStudentId(null)} />
          <QueryView query={report}>
            {(data) => (
              <>
                <PageHeader title={data.studentName} description="Deneme Ligi raporu · salt okunur" />
                {!data.available ? (
                  <EmptyState title="Bu öğrenci için yayınlanmış sonuç yok" />
                ) : (
                  <>
                    {data.summary.map((line) => <Text key={line} tone="secondary">{line}</Text>)}
                    <Section title="Denemeler" first>
                      {data.exams.map((exam) => <Row key={exam.id} title={exam.title} subtitle={`${exam.family} · ${formatDayMonth(exam.takenAt)}`} meta={`${exam.correctCount} D · ${exam.wrongCount} Y · ${exam.blankCount} B · ${exam.totalNet.toFixed(2)} net`} />)}
                    </Section>
                    <Section title={`Kazanımlar (zayıf eşiği %${Math.round(data.weakThreshold)})`}>
                      {data.outcomes.length ? data.outcomes.map((item) => <Row key={item.id} title={`${item.code} · ${item.title}`} subtitle={item.unitName} meta={`%${Math.round(item.latestAccuracy)}${item.delta !== null ? ` (${item.delta >= 0 ? '+' : ''}${Math.round(item.delta)})` : ''} · ${item.questionCount} soru`} />) : <EmptyState title="Kazanım verisi yok" />}
                    </Section>
                  </>
                )}
              </>
            )}
          </QueryView>
        </>
      ) : (
        <>
          <PageHeader title="Deneme Ligi raporları" description="Yalnız ilişkili öğrencilerin yayınlanmış sonuçları." />
          <QueryView query={students} disabledTitle="Deneme Ligi raporları şu anda açık değil.">
            {(data) =>
              data.students.length ? (
                <Section first>{data.students.map((item) => <Row key={item.studentId} testID={`odk-related-${item.studentId}`} title={item.name} subtitle={item.context} onPress={() => setStudentId(item.studentId)} />)}</Section>
              ) : (
                <EmptyState title="İlişkili öğrenci yok" />
              )
            }
          </QueryView>
        </>
      )}
    </Screen>
  );
}
