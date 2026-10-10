import type { MobileParentCoaching } from '@contracts/parent';
import { View } from 'react-native';

import { EmptyState, Row, Section, Text } from '@/design/primitives';
import { fetchParentCoaching } from '@/lib/api/parent';
import { formatDayMonth, formatShortDateTime } from '@/lib/format/istanbul';

import { useParentQuery } from './parent-context';
import { ParentQueryView, ParentScreen, parentStyles, usePullToRefresh } from './parent-shared';

/**
 * VELİ · YÖN KOÇLUK — web `app/panel/veli/kocluk` (aynı yükleyici). Yalnız
 * yayınlanmış plan / koç özeti ve PARENT_VISIBLE notlar. Görüşmeler salt
 * okunur: saat değişikliği talebi ve katılım bağlantısı mobilde yoktur (web
 * devam yolu). İç koç notu, ham check-in, enerji / zorluk girdisi yanıtta yok.
 */
export default function ParentCoachingScreen() {
  const query = useParentQuery('coaching', fetchParentCoaching);
  const refresh = usePullToRefresh(() => query.refetch());
  return (
    <ParentScreen title="Yön Koçluk" testID="parent-coaching" refresh={refresh}>
      {(child) => <ParentQueryView query={query} child={child}>{(data) => <CoachingBody data={data} />}</ParentQueryView>}
    </ParentScreen>
  );
}

function CoachingBody({ data }: { data: MobileParentCoaching }) {
  if (!data.available) return <EmptyState title="Bu öğrencide Yön Koçluk bulunmuyor" body="Koçluk eklendiğinde haftalık plan, tamamlanma oranı ve koç özeti burada görünür." />;
  return (
    <>
      {data.coach ? (
        <Section title="Koç" first>
          <Row title="Koçu" meta={data.coach.name} />
          <Row title="Sonraki görüşme" meta={data.coach.awaitingNewTime ? 'Yeni saat bekleniyor' : data.coach.nextScheduledAt ? formatShortDateTime(data.coach.nextScheduledAt) : 'Planlanmadı'} />
          {data.coach.focus ? <Row title="Haftanın odağı" subtitle={data.coach.focus} /> : null}
          {data.coach.sharedNote ? <View style={parentStyles.card}><Text tone="secondary">{data.coach.sharedNote}</Text></View> : null}
        </Section>
      ) : (
        <Section title="Koç" first><Text tone="secondary">Koç ataması tamamlandığında burada görünür.</Text></Section>
      )}

      {data.sessions.length ? (
        <Section title="Planlanan görüşmeler">
          {data.sessions.map((session) => (
            <Row
              key={session.id}
              title={formatShortDateTime(session.scheduledAt)}
              subtitle={session.proposedAt ? `Önerilen yeni saat: ${formatShortDateTime(session.proposedAt)}` : session.rescheduleRequested ? 'Saat değişikliği talebi alındı' : null}
            />
          ))}
        </Section>
      ) : null}

      <Section title="Bu hafta">
        {data.week ? (
          <>
            <Text tone="muted" variant="meta">{`${formatDayMonth(data.week.start)} – ${formatDayMonth(data.week.end)}`}</Text>
            <Text variant="bodyStrong">{data.week.planCompletionPct === null ? 'Plan tamamlanma bilgisi henüz yok.' : `Planın %${data.week.planCompletionPct}'i tamamlandı.`}</Text>
            {data.week.lines.map((line) => <Text key={line} tone="secondary">{line}</Text>)}
          </>
        ) : (
          <EmptyState title="Bu hafta için plan yayınlanmadı" body="Koç haftalık planı yayınladığında tamamlanma özeti burada görünür." />
        )}
      </Section>

      {data.summary ? (
        <Section title="Koç özeti">
          {data.summary.coachSummary ? <Text>{data.summary.coachSummary}</Text> : null}
          {data.summary.strengths ? <Row title="Güçlü" subtitle={data.summary.strengths} /> : null}
          {data.summary.focusAreas ? <Row title="Odak" subtitle={data.summary.focusAreas} /> : null}
          {data.summary.nextWeekFocus ? <Row title="Gelecek hafta" subtitle={data.summary.nextWeekFocus} /> : null}
        </Section>
      ) : null}

      {data.notes.length ? (
        <Section title="Koç notları">
          {data.notes.map((note) => <Row key={note.id} title={note.body} subtitle={formatDayMonth(note.createdAt)} />)}
        </Section>
      ) : null}

      {data.goals.length ? (
        <Section title="Hedefler">
          {data.goals.map((goal) => <Row key={goal.id} title={goal.label} meta={goal.percent === null ? 'ölçüm yok' : `%${Math.round(goal.percent)} ilerleme`} />)}
        </Section>
      ) : null}

      <Text tone="muted" variant="meta">Bu ekran sakin bir özet sunar. İç koç notları, ham check-in ayrıntıları ve diğer öğrencilerin verisi paylaşılmaz.</Text>
    </>
  );
}
