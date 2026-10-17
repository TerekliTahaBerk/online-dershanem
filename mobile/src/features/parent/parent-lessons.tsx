import { CalendarExport } from '@/features/shared/calendar-export';
import { EmptyState, Row, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchParentLessons } from '@/lib/api/parent';
import { formatDayMonth, formatTime } from '@/lib/format/istanbul';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, usePullToRefresh } from './parent-shared';

/**
 * VELİ · DERSLER — web `app/panel/veli/takvim` (aynı yükleyici). Yoklama
 * etiketi sunucudan. Yalnız ortak ders notunun konusu; öğretmenin öğrenciye
 * özel notu yanıtta yoktur. Takvim yetkili ICS dosyası olarak indirilir ve native paylaşılır.
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
              <EmptyState title="Bu öğrencinin canlı dersleri henüz açık değil" body="onlinedershanem. eklendiğinde ders takvimi ve katılım bilgisi burada görünecek." />
            ) : !data.lessons.length ? (
              <EmptyState title="Henüz bir ders kaydı yok 📚" body="Dersler planlandıkça tarih, öğretmen ve katılım bilgisi burada listelenecek." />
            ) : (
              <>
                <CalendarExport key={child.studentId} studentId={child.studentId} />
                <Section title="Son ders özeti" first>
                  <Text tone="secondary">{data.lastSummary ?? 'Öğretmen henüz ders özetini eklemedi. Eklendiğinde burada görünecek 📝'}</Text>
                  <Text tone="muted" variant="meta">Öğretmenin öğrenciye özel notları veliyle paylaşılmaz.</Text>
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
