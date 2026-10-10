import type { MobileParentOdkReport } from '@contracts/parent';

import { EmptyState, Row, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchParentOdkReport } from '@/lib/api/parent';
import { formatDayMonth } from '@/lib/format/istanbul';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, usePullToRefresh } from './parent-shared';

const net = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

/**
 * VELİ · DENEME LİGİ RAPORU — `getOdkAudienceStudentReport` (gerçek PARENT
 * izleyici; web `app/panel/odk/veli/raporlar`). Yalnız yayınlanmış sonuçlar,
 * sözleşmede `parentReports` hakkı varken. Karşılaştırma yalnız öğrencinin
 * KENDİ önceki denemesiyle (aynı tür varsa onunla); sıralama yok. Okul /
 * kurum dış denemeleri bu ekranda DEĞİL ("Okul ve kurum denemeleri").
 */
export default function ParentOdkReportsScreen() {
  const query = useParentQuery('odk-report', fetchParentOdkReport, { gcTime: 5 * 60_000 });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Deneme Ligi raporu" testID="parent-odk-reports" refresh={refresh}>
      {(child) => <ParentQueryView query={query} child={child}>{(data) => <ReportBody data={data} />}</ParentQueryView>}
    </ParentScreen>
  );
}

function ReportBody({ data }: { data: MobileParentOdkReport }) {
  if (!data.available) {
    return <EmptyState title="Bu öğrenci için yayınlanmış Deneme Ligi raporu yok" body="Sonuçlar yayınlandığında ve paket veli raporunu içerdiğinde burada görünür." />;
  }
  if (!data.exams.length) return <EmptyState title="Henüz yayınlanmış sonuç yok" body="Deneme sonuçları açıklandığında burada görünür." />;
  const weak = data.outcomes.filter((outcome) => outcome.latestAccuracy < data.weakThreshold).length;
  return (
    <>
      <Section title="Özet" first>
        {data.summary.map((line, index) => <Text key={`${index}-${line}`}>{line}</Text>)}
        <Text tone="muted" variant="meta">Karşılaştırma yalnız öğrencinin kendi önceki denemeleriyle yapılır.</Text>
      </Section>
      <Section title="Yayınlanmış denemeler">
        {data.exams.map((exam) => (
          <Row
            key={exam.id}
            title={exam.title}
            subtitle={`${exam.family} · ${formatDayMonth(exam.takenAt)} · D ${exam.correctCount} · Y ${exam.wrongCount} · B ${exam.blankCount}`}
            meta={`${net(exam.totalNet)} net`}
          />
        ))}
      </Section>
      {data.outcomes.length ? (
        <Section title="Kazanımlar">
          <Text tone="muted" variant="meta">{`Yüzde, bağlı sorulardaki doğru oranıdır; az sorulu ölçümlerde yeni kanıt bekleyin.${weak ? ` ${weak} kazanım %${data.weakThreshold} altında.` : ''}`}</Text>
          {data.outcomes.map((outcome) => (
            <Row
              key={outcome.id}
              title={outcome.title}
              subtitle={`${outcome.unitName} · ${outcome.questionCount} soru`}
              trailing={<StatusBadge label={`%${Math.round(outcome.latestAccuracy)}${outcome.delta !== null ? ` (${outcome.delta > 0 ? '+' : ''}${Math.round(outcome.delta)})` : ''}`} tone={outcome.latestAccuracy < data.weakThreshold ? 'warning' : 'neutral'} />}
            />
          ))}
        </Section>
      ) : null}
    </>
  );
}
