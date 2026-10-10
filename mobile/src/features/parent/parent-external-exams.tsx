import { EmptyState, Row, Section, Text } from '@/design/primitives';
import { fetchParentExternalExams } from '@/lib/api/parent';
import { formatDayMonth } from '@/lib/format/istanbul';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, usePullToRefresh } from './parent-shared';

const net = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

/**
 * VELİ · OKUL VE KURUM DENEMELERİ — öğretmen / koçun girdiği DIŞ deneme
 * kayıtları (`MockExam`; web `app/panel/veli/denemeler`). Deneme Ligi
 * raporu ayrı ekrandır. Salt okunur.
 */
export default function ParentExternalExamsScreen() {
  const query = useParentQuery('external-exams', fetchParentExternalExams);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Okul ve kurum denemeleri" description="Öğretmen veya koçun girdiği deneme sonuçları. Deneme Ligi raporu ayrı bölümdedir." testID="parent-external-exams" refresh={refresh}>
      {(child) => (
        <ParentQueryView query={query} child={child} disabledTitle="Deneme analizi şu anda açık değil.">
          {(data) =>
            !data.available ? (
              <EmptyState title="Bu öğrencide deneme üyeliği yok" body="Deneme ürünü eklendiğinde sonuçlar burada görünür." />
            ) : !data.exams.length ? (
              <EmptyState title="Henüz kayıtlı deneme yok" body="Öğretmen veya koç bir deneme sonucu girdiğinde burada görünür." />
            ) : (
              <>
                {data.exams.map((exam, index) => (
                  <Section key={exam.id} title={`${exam.title} · ${formatDayMonth(exam.takenAt)}`} first={index === 0}>
                    <Text variant="bodyStrong">{`Toplam ${net(exam.totalNet)} net`}</Text>
                    {exam.sections.map((section) => (
                      <Row key={section.subjectName} title={section.subjectName} subtitle={`D ${section.correctCount} · Y ${section.incorrectCount}`} meta={`${net(section.net)} net`} />
                    ))}
                  </Section>
                ))}
              </>
            )
          }
        </ParentQueryView>
      )}
    </ParentScreen>
  );
}
