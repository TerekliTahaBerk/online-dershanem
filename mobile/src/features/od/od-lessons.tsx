import type { MobileLessonRow } from '@contracts/student';
import { useState } from 'react';

import { EmptyState, PageHeader, Row, Screen, SegmentedTabs, StatusBadge } from '@/design/primitives';
import type { Tone } from '@/design/tokens';
import { fetchLessons } from '@/lib/api/student';
import { formatShortDateTime } from '@/lib/format/istanbul';
import { lessonDetailHref } from '@/navigation/od-targets';

import { QueryView, useOdNavigation, useOdQuery, usePullToRefresh } from './shared';

/**
 * OD · DERSLER — web `app/panel/ogrenci/takvim` karşılığı (Yaklaşan /
 * Tamamlanan). Durum etiketi sunucudan gelir; her satır yetkili ders
 * detayına gider (sunucu yine sahipliği doğrular). Saatler İstanbul.
 */
type Filter = 'yaklasan' | 'tamamlanan';

export default function OdLessonsScreen() {
  const [filter, setFilter] = useState<Filter>('yaklasan');
  const query = useOdQuery('lessons', (api, signal) => fetchLessons(api, filter, signal), { params: { durum: filter } });
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen testID="od-lessons" refreshing={refresh.refreshing} onRefresh={refresh.onRefresh}>
      <PageHeader title="Derslerin" description={query.data?.groupNames || undefined} />
      <SegmentedTabs
        label="Ders görünümü"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'yaklasan', label: 'Yaklaşan' },
          { value: 'tamamlanan', label: 'Tamamlanan' },
        ]}
      />
      <QueryView query={query}>
        {(data) => {
          if (!data.profile) return <EmptyState title="Hesabını hazırlıyoruz." body="Her şey hazır olduğunda ders takvimini burada göreceksin." />;
          if (!data.lessons.length) {
            return filter === 'yaklasan' ? (
              <EmptyState title="Yaklaşan bir dersin yok." body="Yeni bir ders planlandığında ilk burada göreceksin." />
            ) : (
              <EmptyState title="Henüz tamamlanan bir ders yok." body="Derslerin işlendikçe burada birikecek; dilediğinde geri dönüp bakabilirsin." />
            );
          }
          return data.lessons.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} />);
        }}
      </QueryView>
    </Screen>
  );
}

function lessonTone(lesson: MobileLessonRow): Tone {
  if (lesson.attendance === 'ABSENT') return 'warning';
  if (lesson.status === 'CANCELLED') return 'neutral';
  if (lesson.statusLabel === 'Bugün') return 'info';
  if (lesson.status === 'COMPLETED') return 'success';
  return 'neutral';
}

function LessonRow({ lesson }: { lesson: MobileLessonRow }) {
  const nav = useOdNavigation();
  const href = lessonDetailHref(lesson.id);
  return (
    <Row
      testID={`lesson-${lesson.id}`}
      title={lesson.title}
      subtitle={[formatShortDateTime(lesson.startsAt), lesson.teacherName, lesson.groupName].filter(Boolean).join(' · ')}
      trailing={<StatusBadge label={lesson.statusLabel} tone={lessonTone(lesson)} />}
      onPress={href ? () => nav.push(href) : undefined}
      accessibilityHint="Ders ayrıntılarını açar"
    />
  );
}
