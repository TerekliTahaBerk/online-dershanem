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
    <ParentScreen title="Okul ve kurum denemeleri" description="Öğretmen ya da koçun girdiği deneme sonuçları 📊 Deneme Ligi raporunu ayrı bölümde bulabilirsiniz." testID="parent-external-exams" refresh={refresh}>
      {(child) => (
        <ParentQueryView query={query} child={child} disabledTitle="Deneme analizi şu an kullanıma kapalı.">
          {(data) =>
            !data.available ? (
              <EmptyState title="Bu öğrencinin deneme üyeliği henüz yok" body="Deneme ürünü eklendiğinde sonuçlar burada görünecek." />
            ) : !data.exams.length ? (
              <EmptyState title="Henüz kayıtlı bir deneme yok 📝" body="Öğretmen ya da koç bir deneme sonucu girdiğinde burada görünecek." />
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
