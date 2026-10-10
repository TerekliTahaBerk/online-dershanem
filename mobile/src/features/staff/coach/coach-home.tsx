import { useRouter, type Href } from 'expo-router';

import { Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchCoachHome } from '@/lib/api/staff';
import { formatLongDate, formatShortDateTime, formatTime } from '@/lib/format/istanbul';

import { WorkspaceSwitcher } from '../../shell/workspace-switcher';
import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';

/**
 * KOÇ · BUGÜN — web Yön Bugün ile AYNI `loadCoachWorkspace` (dikkat
 * nedenleri sunucuda hesaplanır, burada yeniden üretilmez). Özel not yok.
 */
export default function CoachHomeScreen() {
  const query = useStaffQuery('OK', 'coach-home', (api, signal) => fetchCoachHome(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  const router = useRouter();
  const student = (id: string) => router.push(`/coach/student/${encodeURIComponent(id)}` as Href);
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="coach-home">
      <PageHeader title="Bugün" context={<Text tone="muted" variant="meta">{formatLongDate(new Date())}</Text>} />
      <WorkspaceSwitcher />
      <QueryView query={query}>
        {(home) => (
          <>
            <Text tone="secondary">{`${home.studentCount} öğrenci · ${home.attentionCount} öğrenci ilgi bekliyor`}</Text>
            <Section title="Bugünkü görüşmeler" first>
              {home.todaySessions.length ? (
                home.todaySessions.map((item) => <Row key={item.id} testID={`coach-today-session-${item.id}`} title={item.studentName} subtitle={item.focus ?? undefined} meta={formatTime(item.at)} onPress={() => router.push(`/coach/session/${encodeURIComponent(item.id)}` as Href)} />)
              ) : (
                <EmptyState title="Bugün görüşme yok" body={home.nextSession ? `Sıradaki: ${home.nextSession.studentName} · ${formatShortDateTime(home.nextSession.at)}` : undefined} />
              )}
            </Section>
            {home.groups.map((group) => (
              <Section key={group.reason} title={group.label} action={<StatusBadge label={String(group.students.length)} tone="warning" />}>
                {group.students.map((item) => <Row key={`${group.reason}:${item.studentId}`} title={item.name} onPress={() => student(item.studentId)} />)}
              </Section>
            ))}
            {!home.groups.length ? <EmptyState title="Bugün ilgi bekleyen öğrenci yok" /> : null}
            <Section>
              <Button label="Öğrencilerim" variant="secondary" onPress={() => router.push('/screen/coach-students' as Href)} />
              <Button label="Görüşmeler" variant="secondary" onPress={() => router.push('/screen/coach-sessions' as Href)} />
              {home.flags.adaptivePlan ? <Button label="Planlar" variant="secondary" onPress={() => router.push('/screen/plan' as Href)} /> : null}
            </Section>
          </>
        )}
      </QueryView>
    </Screen>
  );
}
