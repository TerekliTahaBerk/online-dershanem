import type { LessonRange } from '@contracts/staff';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';

import { EmptyState, PageHeader, Row, Screen, SegmentedTabs, Section, StatusBadge } from '@/design/primitives';
import { fetchTeacherLessons } from '@/lib/api/staff';
import { formatDayMonth, formatTime } from '@/lib/format/istanbul';

import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

const STATUS = { PLANNED: { label: 'Planlandı', tone: 'info' }, COMPLETED: { label: 'Tamamlandı', tone: 'success' }, CANCELLED: { label: 'İptal', tone: 'neutral' } } as const;

/** ÖĞRETMEN · DERSLER — yalnız kendi dersleri (sunucu `teacherId`). */
export default function TeacherLessonsScreen() {
  const [range, setRange] = useState<LessonRange>('yaklasan');
  const query = useStaffQuery('OD', 'teacher-lessons', (api, signal) => fetchTeacherLessons(api, range, signal), { params: { range } });
  const refresh = usePullToRefresh(() => query.refetch());
  const router = useRouter();
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-lessons">
      <PageHeader title="Dersler" />
      <SegmentedTabs label="Ders aralığı" value={range} onChange={setRange} options={[{ value: 'yaklasan', label: 'Yaklaşan' }, { value: 'gecmis', label: 'Son 30 gün' }]} />
      <QueryView query={query}>
        {(data) =>
          data.lessons.length ? (
            <Section first>
              {data.lessons.map((lesson) => (
                <Row
                  key={lesson.id}
                  testID={`teacher-lesson-${lesson.id}`}
                  title={lesson.title}
                  subtitle={`${formatDayMonth(lesson.startsAt)} ${formatTime(lesson.startsAt)} · ${lesson.groupName} · ${lesson.subject}`}
                  meta={lesson.status === 'PLANNED' && new Date(lesson.endsAt) < new Date() ? `Kapanış bekliyor · yoklama ${lesson.attendanceRecorded}/${lesson.studentCount}` : `${lesson.studentCount} öğrenci${lesson.hasSharedNote ? ' · not var' : ''}`}
                  trailing={<StatusBadge label={STATUS[lesson.status].label} tone={STATUS[lesson.status].tone} />}
                  onPress={() => router.push(`/teacher/lesson/${encodeURIComponent(lesson.id)}` as Href)}
                />
              ))}
            </Section>
          ) : (
            <EmptyState title={range === 'yaklasan' ? 'Yaklaşan dersin yok' : 'Son 30 günde ders yok'} />
          )
        }
      </QueryView>
    </Screen>
  );
}
