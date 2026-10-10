import type { MobileYonToday } from '@contracts/yon';
import { useRouter, type Href } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { Button, EmptyState, PageHeader, Row, Screen, Section, StatusBadge, Text } from '@/design/primitives';
import { useDesign } from '@/design/theme';
import { color, radius, space } from '@/design/tokens';
import { fetchYonToday } from '@/lib/api/yon';
import { useReadyBootstrap } from '@/lib/auth/session-provider';
import { formatDayMonth, formatLongDate, formatShortDateTime, greetingFor } from '@/lib/format/istanbul';
import { isSafeExternalUrl } from '@/lib/links';
import { expoHrefFor, targetForNavId } from '@/navigation/route-map';

import { taskHref } from './model';
import { QueryView, usePullToRefresh, useYonNavigation, useYonQuery } from './shared';
import { YonTaskRow } from './task-row';

/**
 * YÖN · BUGÜN — web `app/panel/ogrenci/yon/page.tsx`'in native karşılığı.
 * Veri `GET /api/panel/student/yon` (web ile aynı yükleyici `loadYonToday`).
 * Sıralama, gecikenlerin sınırı, haftalık sayılar ve "Şimdi" seçimi
 * sunucudan gelir; burada kural üretilmez. OD ödevleri bu ekrana girmez.
 * `adaptivePlan` kapalıyken ekran gizlenmez; yalnız tamamlama kontrolleri
 * görünmez.
 */
const DAY_SHORT = new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', weekday: 'short' });

function minutesLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} dk`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} sa ${rest} dk` : `${hours} sa`;
}

export default function YonTodayScreen() {
  const query = useYonQuery('yon-today', (api, signal) => fetchYonToday(api, signal));
  const refresh = usePullToRefresh(() => query.refetch());
  const bootstrap = useReadyBootstrap();
  const now = new Date();
  const name = bootstrap.user.fullName?.split(' ')[0] ?? null;
  const data = query.data;
  const description =
    data?.state === 'READY'
      ? [data.hasPlan ? `${data.openToday} görev` : null, data.hasPlan && data.remainingMinutesToday ? `~${minutesLabel(data.remainingMinutesToday)}` : null, data.nextSession ? `${formatShortDateTime(data.nextSession.scheduledAt)} koç görüşmesi` : null]
          .filter(Boolean)
          .join(' · ') || 'Planın, koçun ve hedeflerin burada.'
      : undefined;
  return (
    <Screen refreshing={refresh.refreshing} onRefresh={refresh.onRefresh} testID="yon-today">
      <PageHeader title={`${greetingFor(now)}${name ? `, ${name}` : ''}.`} context={<Text tone="muted" variant="meta">{formatLongDate(now)}</Text>} description={description} />
      <QueryView query={query}>{(home) => <YonTodayBody home={home} />}</QueryView>
    </Screen>
  );
}

function YonTodayBody({ home }: { home: MobileYonToday }) {
  if (home.state === 'NO_PROFILE') {
    return <EmptyState title="Hesabını hazırlıyoruz." body="Her şey hazır olduğunda Yön Koçluk planını burada göreceksin." />;
  }
  const nowTask = home.nowTaskId ? [...home.today, ...home.overdue].find((task) => task.id === home.nowTaskId) ?? null : null;
  return (
    <>
      {home.canComplete && nowTask ? <NowBlock title={nowTask.title} meta={`${nowTask.durationMinutes} dk${nowTask.targetLabel ? ` · ${nowTask.targetLabel}` : ''}`} taskId={nowTask.id} overdue={home.overdue.some((task) => task.id === nowTask.id)} /> : null}
      <Section title="Bugün senin için" first>
        {!home.hasPlan ? (
          <EmptyState title="Bu haftanın planı henüz hazır değil." body="Koçun planını yayınladığında bugünün görevlerini burada göreceksin." />
        ) : home.today.length === 0 ? (
          <Text tone="secondary">Bugün için bir görevin yok. İstersen haftanın geri kalanına göz at.</Text>
        ) : (
          home.today.map((task) => <YonTaskRow key={task.id} task={task} canOpen={home.canComplete} />)
        )}
      </Section>
      {home.overdueTotal ? (
        <Section title="Yetiştirmen gerekenler">
          <Text tone="secondary" variant="secondary">
            {home.overdueTotal > home.overdue.length ? `${home.overdueTotal} görevin biraz gecikti; en eski ${home.overdue.length} tanesini aşağıya koyduk.` : 'Tarihi geçen görevlerin. Bugüne sığmıyorsa koçuna söylemen yeterli.'}
          </Text>
          {home.overdue.map((task) => <YonTaskRow key={task.id} task={task} canOpen={home.canComplete} showDate />)}
        </Section>
      ) : null}
      <WeekSection home={home} />
      <SessionSection home={home} />
      <Section title="Koçundan son not">
        {home.coachNote ? (
          <View style={styles.note}>
            <Text>{home.coachNote.body}</Text>
            {home.coachNote.at ? <Text tone="muted" variant="meta">{formatDayMonth(home.coachNote.at)}</Text> : null}
          </View>
        ) : (
          <Text tone="secondary">Koçun henüz bir not bırakmadı.</Text>
        )}
      </Section>
      <GoalsSection home={home} />
      {home.checkIn ? <CheckInSection checkIn={home.checkIn} /> : null}
    </>
  );
}

function NowBlock({ title, meta, taskId, overdue }: { title: string; meta: string; taskId: string; overdue: boolean }) {
  const router = useRouter();
  const href = taskHref(taskId);
  return (
    <View style={styles.now} testID="yon-now">
      <Text variant="caption" tone="muted">Şimdi</Text>
      <Text variant="sectionTitle" accessibilityRole="header">{title}</Text>
      <Text tone="secondary">{`${meta} · ${overdue ? 'Önceki günlerden kalan bir görevin.' : 'Bugünkü planında seni bekliyor.'}`}</Text>
      {href ? (
        <View style={styles.actions}>
          <Button label="Hadi başlayalım" onPress={() => router.push(href as Href)} testID="yon-now-cta" />
        </View>
      ) : null}
    </View>
  );
}

function WeekSection({ home }: { home: Extract<MobileYonToday, { state: 'READY' }> }) {
  const { product } = useDesign();
  const nav = useYonNavigation();
  const plan = nav.navigation && nav.has('plan') ? expoHrefFor(targetForNavId(nav.navigation, 'plan')) : null;
  return (
    <Section title="Bu hafta" action={plan ? <Button label="Planım" variant="quiet" onPress={() => nav.push(plan)} /> : undefined}>
      {home.hasPlan ? (
        <>
          <Text tone="secondary">{`${home.week.done}/${home.week.total} görev · ${minutesLabel(home.week.doneMinutes)} / ${minutesLabel(home.week.plannedMinutes)}${home.week.remaining ? ` · ${home.week.remaining} görev kaldı` : ''}`}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.days} accessibilityLabel="Haftanın günleri">
            {home.week.days.map((day) => (
              <View
                key={day.key}
                style={[styles.day, day.isToday && { backgroundColor: product.accentSoft }]}
                accessible
                accessibilityLabel={`${DAY_SHORT.format(new Date(`${day.key}T12:00:00+03:00`))}: ${day.total ? `${day.done}/${day.total} görev` : 'görev yok'}${day.isToday ? ', bugün' : ''}`}>
                <Text variant="meta" tone={day.isToday ? 'accent' : 'muted'} accentColor={product.accent}>
                  {DAY_SHORT.format(new Date(`${day.key}T12:00:00+03:00`))}
                </Text>
                <Text variant="numeric">{day.total ? `${day.done}/${day.total}` : '—'}</Text>
              </View>
            ))}
          </ScrollView>
        </>
      ) : (
        <Text tone="secondary">Planın yayınlandığında haftalık ilerlemeni burada göreceksin.</Text>
      )}
    </Section>
  );
}

function SessionSection({ home }: { home: Extract<MobileYonToday, { state: 'READY' }> }) {
  const nav = useYonNavigation();
  const coaching = nav.navigation && nav.has('coaching') ? expoHrefFor(targetForNavId(nav.navigation, 'coaching')) : null;
  if (!home.coach) {
    return (
      <Section title="Sıradaki görüşme">
        <Text tone="secondary">Koçunla çok yakında tanışacaksın. Koçun belli olduğunda görüşmelerin burada olacak.</Text>
      </Section>
    );
  }
  const session = home.nextSession;
  const meetingUrl = session?.meetingUrl && isSafeExternalUrl(session.meetingUrl) ? session.meetingUrl : null;
  return (
    <Section title="Sıradaki görüşme">
      <Row title="Koç" meta={home.coach.name} />
      <Row
        title="Zaman"
        meta={session ? formatShortDateTime(session.scheduledAt) : home.coach.overdue ? 'Yeni saat belirleniyor' : 'Henüz planlanmadı'}
        trailing={session?.rescheduleRequested ? <StatusBadge label="Yeni saat istendi" tone="info" /> : undefined}
      />
      {session?.focus || home.coach.focus ? <Row title="Odak" subtitle={session?.focus || home.coach.focus} /> : null}
      <View style={styles.actions}>
        {meetingUrl ? <Button label="Görüşmeye katıl" variant="secondary" onPress={() => void Linking.openURL(meetingUrl)} /> : null}
        {coaching ? <Button label="Koçum" variant="quiet" onPress={() => nav.push(coaching)} /> : null}
      </View>
    </Section>
  );
}

function GoalsSection({ home }: { home: Extract<MobileYonToday, { state: 'READY' }> }) {
  const nav = useYonNavigation();
  const goals = nav.navigation && nav.has('goals') ? expoHrefFor(targetForNavId(nav.navigation, 'goals')) : null;
  const NUM = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
  return (
    <Section title="Hedeflerim" action={goals && home.goalsTotal ? <Button label="Tümü" variant="quiet" onPress={() => nav.push(goals)} /> : undefined}>
      {home.goals.length ? (
        home.goals.map((goal) => (
          <Row
            key={goal.id}
            title={goal.label}
            subtitle={goal.current === null ? 'Henüz ölçülmedi' : goal.isPercent ? `Şu an %${NUM.format(goal.current)}` : `Şu an ${NUM.format(goal.current)}`}
            meta={`${NUM.format(goal.target)}${goal.isPercent ? '%' : ''}`}
          />
        ))
      ) : (
        <Text tone="secondary">Henüz bir hedefin yok. İlk görüşmende koçunla birlikte belirleyebilirsiniz.</Text>
      )}
    </Section>
  );
}

function CheckInSection({ checkIn }: { checkIn: NonNullable<Extract<MobileYonToday, { state: 'READY' }>['checkIn']> }) {
  const nav = useYonNavigation();
  const href = nav.navigation && nav.has('check-in') ? expoHrefFor(targetForNavId(nav.navigation, 'check-in')) : null;
  return (
    <Section title="Check-in">
      <Text>{checkIn.submittedThisWeek && checkIn.lastAt ? `Bu haftanın check-in'ini yaptın, teşekkürler · ${formatDayMonth(checkIn.lastAt)}` : 'Bu hafta nasıl geçiyor? Check-in ile koçuna kısaca anlat.'}</Text>
      {href ? <Button label={checkIn.submittedThisWeek ? "Check-in'e git" : 'Check-in yap'} variant={checkIn.submittedThisWeek ? 'quiet' : 'secondary'} onPress={() => nav.push(href)} /> : null}
    </Section>
  );
}

const styles = StyleSheet.create({
  now: { gap: space[2], borderWidth: 1, borderColor: color.border, borderRadius: radius.card, padding: space[4], marginBottom: space[2] },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[2] },
  days: { flexDirection: 'row', gap: space[1], marginTop: space[2] },
  day: { minWidth: 42, flexGrow: 1, alignItems: 'center', paddingVertical: space[2], borderRadius: radius.control, gap: 2 },
  note: { gap: space[1], borderLeftWidth: 2, borderLeftColor: color.borderStrong, paddingLeft: space[3] },
});
