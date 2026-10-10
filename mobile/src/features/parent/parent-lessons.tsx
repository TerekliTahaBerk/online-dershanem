import { EmptyState, Row, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchParentLessons } from '@/lib/api/parent';
import { formatDayMonth, formatTime } from '@/lib/format/istanbul';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, usePullToRefresh } from './parent-shared';

/**
 * VELİ · DERSLER — web `app/panel/veli/takvim` (aynı yükleyici). Yoklama
 * etiketi sunucudan. Yalnız ortak ders notunun konusu; öğretmenin öğrenciye
 * özel notu yanıtta yoktur. Takvime yazma (native izin) M6 kapsamı dışıdır.
 */
export default function ParentLessonsScreen() {
  const query = useParentQuery('lessons', fetchParentLessons);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Dersler" testID="parent-lessons" refresh={refresh}>
      {(child) => (
        <ParentQueryView query={query} child={child}>
          {(data) =>
            !data.available ? (
              <EmptyState title="Bu öğrencinin canlı ders üyeliği yok" body="onlinedershanem. üyeliği eklendiğinde ders takvimini ve katılımı burada görebilirsiniz." />
            ) : !data.lessons.length ? (
              <EmptyState title="Henüz planlanmış bir ders yok" body="Dersler planlandıkça tarih, öğretmen ve katılım bilgisini burada görebilirsiniz." />
            ) : (
              <>
                <Section title="Son ders özeti" first>
                  <Text tone="secondary">{data.lastSummary ?? 'Öğretmen bu dersin özetini henüz eklemedi. Eklediğinde burada görebilirsiniz.'}</Text>
                  <Text tone="muted" variant="meta">Öğretmenin öğrencinize özel notları gizlilik gereği burada yer almaz.</Text>
                </Section>
                <Section title="Ders listesi">
                  {data.lessons.map((lesson) => (
                    <Row
                      key={lesson.id}
                      testID={`parent-lesson-${lesson.id}`}
                      title={lesson.topic ? `${lesson.title} · ${lesson.topic}` : lesson.title}
                      subtitle={`${formatDayMonth(lesson.startsAt)} · ${formatTime(lesson.startsAt)}${lesson.teacherName ? ` · ${lesson.teacherName}` : ''}`}
                      trailing={<StatusBadge label={lesson.attendance.label} tone={lesson.attendance.tone} />}
                    />
                  ))}
                </Section>
              </>
            )
          }
        </ParentQueryView>
      )}
    </ParentScreen>
  );
}
