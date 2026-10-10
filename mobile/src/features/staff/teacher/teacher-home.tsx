import type { MobileTeacherHome } from '@contracts/staff';
import { useRouter, type Href } from 'expo-router';

import { Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { fetchTeacherHome } from '@/lib/api/staff';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { formatLongDate, formatShortDateTime, formatTime } from '@/lib/format/istanbul';

import { openOnWeb } from '../../shell/web-continuation';
import { QueryView, usePullToRefresh, useStaffQuery } from '../shared';
import { staffHref, staffWebPath } from '../targets';

const PREP_TONE = { needs_prep: 'warning', ready: 'info', needs_close: 'warning', closed: 'success' } as const;

/**
 * ÖĞRETMEN · BUGÜN — "Bugün ne yapmam gerekiyor?" Web `app/panel/ogretmen`
 * ile AYNI `getTeacherWorkspace` (öncelik ve dikkat hesapları sunucuda).
 * Her eylem gerçek bir native ekrana ya da açıkça etiketli web devamına gider.
 */
export default function TeacherHomeScreen() {
  const query = useStaffQuery('OD', 'teacher-home', (api, signal) => fetchTeacherHome(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="teacher-home">
      <PageHeader title="Bugün" context={<Text tone="muted" variant="meta">{formatLongDate(new Date())}</Text>} />
      <QueryView query={query}>{(home) => <HomeBody home={home} />}</QueryView>
    </Screen>
  );
}

function HomeBody({ home }: { home: MobileTeacherHome }) {
  const router = useRouter();
  const navigation = useReadyBootstrap().workspace?.navigation;
  const open = (target: MobileTeacherHome['pending'][number]['target']) => {
    const href = staffHref(target, navigation);
    const web = staffWebPath(target);
    if (href) router.push(href as Href);
    else if (web) void openOnWeb(web);
  };
  return (
    <>
      {home.summary ? <Text tone="secondary">{home.summary}</Text> : null}
      <Section title="Bugünkü dersler" first>
        {home.todayLessons.length ? (
          home.todayLessons.map((lesson) => (
            <Row
              key={lesson.id}
              testID={`teacher-today-lesson-${lesson.id}`}
              title={lesson.title}
              subtitle={`${formatTime(lesson.startsAt)}–${formatTime(lesson.endsAt)} · ${lesson.groupName} · ${lesson.studentCount} öğrenci`}
              trailing={<StatusBadge label={lesson.prepLabel} tone={PREP_TONE[lesson.prepStatus]} />}
              onPress={() => router.push(`/teacher/lesson/${encodeURIComponent(lesson.id)}` as Href)}
            />
          ))
        ) : (
          <EmptyState title="Bugün planlanmış dersiniz yok" />
        )}
      </Section>
      <Section title="Bekleyen işler">
        {home.pending.length ? (
          home.pending.map((item) => {
            const native = staffHref(item.target, navigation);
            const web = !native && Boolean(staffWebPath(item.target));
            return (
              <Row
                key={`${item.kind}-${item.id}`}
                testID={`teacher-pending-${item.kind}-${item.id}`}
                title={item.title}
                subtitle={item.detail}
                meta={item.dueAt ? `Son: ${formatShortDateTime(item.dueAt)}` : null}
                trailing={native || web ? <Text tone="muted" variant="meta">{native ? item.ctaLabel : `${item.ctaLabel} (web)`}</Text> : undefined}
                onPress={native || web ? () => open(item.target) : undefined}
              />
            );
          })
        ) : (
          <Text tone="secondary">Şu an bekleyen bir işiniz yok.</Text>
        )}
      </Section>
      {home.attention.length ? (
        <Section title="Dikkat gerektiren öğrenciler">
          <Text tone="muted" variant="meta">Yalnızca kendi gruplarınızdaki öğrenciler, sistemdeki sinyallere göre listelenir.</Text>
          {home.attention.map((item) => <Row key={item.studentId} title={item.studentName} subtitle={`${item.groupName} · ${item.reason}`} meta={item.lastSignal} />)}
        </Section>
      ) : null}
      {home.upcoming.length ? (
        <Section title="Yaklaşanlar">
          {home.upcoming.map((item) => {
            const reachable = Boolean(staffHref(item.target, navigation) || staffWebPath(item.target));
            return <Row key={`${item.kind}-${item.id}`} title={item.title} subtitle={item.detail} meta={formatShortDateTime(item.at)} onPress={reachable ? () => open(item.target) : undefined} />;
          })}
        </Section>
      ) : null}
      <Button label="Derslerim" variant="secondary" onPress={() => router.push('/screen/lessons' as Href)} testID="teacher-go-lessons" />
    </>
  );
}
