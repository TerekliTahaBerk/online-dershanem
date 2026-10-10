import { useRouter, type Href } from 'expo-router';

import { EmptyState, PageHeader, Row, Screen, Section, StatusBadge } from '@/design/primitives';
import { fetchCoachStudents } from '@/lib/api/staff';
import { formatShortDateTime } from '@/lib/format/istanbul';

import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

/** KOÇ · ÖĞRENCİLER — yalnız AKTİF koç ataması olan öğrenciler (sunucu kapsamı). */
export default function CoachStudentsScreen() {
  const query = useStaffQuery('OK', 'coach-students', (api, signal) => fetchCoachStudents(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  const router = useRouter();
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="coach-students">
      <PageHeader title="Öğrencilerim" />
      <QueryView query={query}>
        {(data) =>
          data.students.length ? (
            <Section first>
              {data.students.map((item) => (
                <Row
                  key={item.studentId}
                  testID={`coach-student-${item.studentId}`}
                  title={item.name}
                  subtitle={[item.targetGoal, item.nextScheduledAt ? `Görüşme ${formatShortDateTime(item.nextScheduledAt)}` : 'Planlı görüşme yok'].filter(Boolean).join(' · ')}
                  meta={item.planCompletionPct !== null ? `Plan %${Math.round(item.planCompletionPct)}` : undefined}
                  trailing={item.primaryLabel ? <StatusBadge label={item.primaryLabel} tone="warning" /> : undefined}
                  onPress={() => router.push(`/coach/student/${encodeURIComponent(item.studentId)}` as Href)}
                />
              ))}
            </Section>
          ) : (
            <EmptyState title="Aktif koçluk atamanız yok" body="Atamalar yönetim panelinden yapılır." />
          )
        }
      </QueryView>
    </Screen>
  );
}
